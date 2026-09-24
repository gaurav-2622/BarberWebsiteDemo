import { randomUUID } from "node:crypto";

import type Stripe from "stripe";
import { afterAll, describe, expect, it, vi } from "vitest";

import {
  AppointmentStatus,
  PaymentStatus,
  UserRole,
} from "@/generated/prisma/client";
import { getAvailability } from "@/lib/booking/availability";
import {
  getDayOfWeek,
  getShopDateKey,
  shiftDateKey,
} from "@/lib/booking/time";
import { prisma } from "@/lib/prisma";

import {
  CheckoutError,
  createBookingCheckout,
  getRequiredPayment,
} from "./checkout";

const successEmail = "phase4-checkout-test@example.com";
const failureEmail = "phase4-checkout-failure-test@example.com";

async function getSeedBookingData() {
  const [service, barber] = await Promise.all([
    prisma.service.findUnique({
      where: { slug: "signature-haircut" },
      select: {
        id: true,
        depositCents: true,
      },
    }),
    prisma.user.findFirst({
      where: {
        email: "owner@crownandblade.example",
        isActive: true,
        role: { in: [UserRole.OWNER, UserRole.BARBER] },
      },
      select: { id: true },
    }),
  ]);

  if (!service || !barber) {
    throw new Error("Payment tests require the Phase 1 seed data.");
  }

  return { service, barber };
}

function getFutureOpenDate(daysAhead: number) {
  let date = shiftDateKey(getShopDateKey(), daysAhead);

  while (getDayOfWeek(date) === 0) {
    date = shiftDateKey(date, 1);
  }

  return date;
}

async function buildBookingInput(email: string, daysAhead: number) {
  const { service, barber } = await getSeedBookingData();
  const date = getFutureOpenDate(daysAhead);
  const availability = await getAvailability({
    serviceId: service.id,
    barberId: barber.id,
    date,
  });
  const slot = availability.slots[0];

  if (!slot) {
    throw new Error("Expected a seeded slot for the Stripe checkout test.");
  }

  return {
    input: {
      serviceId: service.id,
      barberId: barber.id,
      date,
      startsAt: slot.start,
      customerName: "Phase Four Checkout Test",
      customerEmail: email,
      customerPhone: "+1-212-555-0155",
    },
    service,
    slot,
  };
}

afterAll(async () => {
  await prisma.appointment.deleteMany({
    where: { customerEmail: { in: [successEmail, failureEmail] } },
  });
  await prisma.$disconnect();
});

describe("Stripe Checkout booking creation", () => {
  it("charges the configured deposit and links the session", async () => {
    await prisma.appointment.deleteMany({
      where: { customerEmail: successEmail },
    });

    const { input, service } = await buildBookingInput(successEmail, 20);
    const sessionId = `cs_test_${randomUUID().replaceAll("-", "")}`;
    let capturedParameters: Stripe.Checkout.SessionCreateParams | undefined;
    let capturedOptions: Stripe.RequestOptions | undefined;
    const create = vi.fn(
      async (
        parameters: Stripe.Checkout.SessionCreateParams,
        options?: Stripe.RequestOptions,
      ) => {
        capturedParameters = parameters;
        capturedOptions = options;

        return {
          id: sessionId,
          url: `https://checkout.stripe.test/pay/${sessionId}`,
        };
      },
    );
    const expire = vi.fn();
    const stripe = {
      checkout: {
        sessions: { create, expire },
      },
    } as unknown as Stripe;

    try {
      const result = await createBookingCheckout(input, {
        appUrl: "http://localhost:3000",
        stripe,
      });

      expect(result.paymentAmountCents).toBe(service.depositCents);
      expect(result.paymentKind).toBe("deposit");
      expect(result.checkoutSessionId).toBe(sessionId);
      expect(result.checkoutUrl).toContain(sessionId);
      expect(capturedParameters?.metadata).toMatchObject({
        appointmentId: result.appointment.id,
        paymentKind: "deposit",
      });
      expect(
        capturedParameters?.payment_intent_data?.metadata,
      ).toMatchObject({
        appointmentId: result.appointment.id,
      });
      expect(
        capturedParameters?.line_items?.[0] &&
          "price_data" in capturedParameters.line_items[0]
          ? capturedParameters.line_items[0].price_data?.unit_amount
          : undefined,
      ).toBe(service.depositCents);
      expect(capturedParameters?.success_url).toBe(
        "http://localhost:3000/booking/success?session_id={CHECKOUT_SESSION_ID}",
      );
      expect(capturedParameters?.cancel_url).toBe(
        "http://localhost:3000/book?payment=cancelled",
      );
      expect(capturedOptions).toMatchObject({
        idempotencyKey: `booking-checkout:${result.appointment.id}`,
      });
      expect(expire).not.toHaveBeenCalled();

      const savedAppointment = await prisma.appointment.findUniqueOrThrow({
        where: { id: result.appointment.id },
        select: {
          status: true,
          paymentStatus: true,
          stripeCheckoutSessionId: true,
        },
      });

      expect(savedAppointment).toEqual({
        status: AppointmentStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        stripeCheckoutSessionId: sessionId,
      });
    } finally {
      await prisma.appointment.deleteMany({
        where: { customerEmail: successEmail },
      });
    }
  });

  it("releases the chair when Stripe cannot create a session", async () => {
    await prisma.appointment.deleteMany({
      where: { customerEmail: failureEmail },
    });

    const { input, slot } = await buildBookingInput(failureEmail, 22);
    const stripe = {
      checkout: {
        sessions: {
          create: vi.fn().mockRejectedValue(new Error("Stripe unavailable")),
          expire: vi.fn(),
        },
      },
    } as unknown as Stripe;

    try {
      await expect(
        createBookingCheckout(input, {
          appUrl: "http://localhost:3000",
          stripe,
        }),
      ).rejects.toMatchObject<Partial<CheckoutError>>({
        code: "CHECKOUT_UNAVAILABLE",
        status: 502,
      });

      const cancelledAppointment =
        await prisma.appointment.findFirstOrThrow({
          where: { customerEmail: failureEmail },
          select: {
            status: true,
            paymentStatus: true,
          },
        });

      expect(cancelledAppointment).toEqual({
        status: AppointmentStatus.CANCELLED,
        paymentStatus: PaymentStatus.FAILED,
      });

      const availability = await getAvailability({
        serviceId: input.serviceId,
        barberId: input.barberId,
        date: input.date,
      });

      expect(
        availability.slots.some(
          (candidate) => candidate.start === slot.start,
        ),
      ).toBe(true);
    } finally {
      await prisma.appointment.deleteMany({
        where: { customerEmail: failureEmail },
      });
    }
  });
});

describe("required checkout amount", () => {
  it("falls back to the full balance when no deposit is configured", () => {
    expect(getRequiredPayment({ depositCents: 0, priceCents: 4_500 })).toEqual({
      amountCents: 4_500,
      kind: "full_balance",
    });
  });
});
