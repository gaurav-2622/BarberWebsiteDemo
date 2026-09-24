import { randomUUID } from "node:crypto";

import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as handleStripeWebhook } from "@/app/api/webhooks/stripe/route";
import {
  AppointmentStatus,
  PaymentStatus,
  UserRole,
} from "@/generated/prisma/client";
import { getAvailability } from "@/lib/booking/availability";
import { createAppointment } from "@/lib/booking/create-appointment";
import {
  getDayOfWeek,
  getShopDateKey,
  shiftDateKey,
} from "@/lib/booking/time";
import { prisma } from "@/lib/prisma";

const webhookSecret = "whsec_phase4_test_secret";
const completedEmail = "phase4-webhook-completed-test@example.com";
const expiredEmail = "phase4-webhook-expired-test@example.com";
const underpaidEmail = "phase4-webhook-underpaid-test@example.com";
const signatureStripe = new Stripe("sk_test_phase4_signature_helper");
let previousStripeKey: string | undefined;
let previousWebhookSecret: string | undefined;

async function getSeedBookingData() {
  const [service, barber] = await Promise.all([
    prisma.service.findUnique({
      where: { slug: "signature-haircut" },
      select: {
        id: true,
        depositCents: true,
        currency: true,
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
    throw new Error("Webhook tests require the Phase 1 seed data.");
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

async function createPendingAppointment(email: string, daysAhead: number) {
  const { service, barber } = await getSeedBookingData();
  const date = getFutureOpenDate(daysAhead);
  const availability = await getAvailability({
    serviceId: service.id,
    barberId: barber.id,
    date,
  });
  const slot = availability.slots[0];

  if (!slot) {
    throw new Error("Expected a seeded slot for the Stripe webhook test.");
  }

  const appointment = await createAppointment({
    serviceId: service.id,
    barberId: barber.id,
    date,
    startsAt: slot.start,
    customerName: "Phase Four Webhook Test",
    customerEmail: email,
    customerPhone: "+1-212-555-0144",
  });
  const sessionId = `cs_test_${randomUUID().replaceAll("-", "")}`;

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { stripeCheckoutSessionId: sessionId },
  });

  return { appointment, service, sessionId };
}

function createEventPayload({
  session,
  type,
}: {
  session: Record<string, unknown>;
  type: "checkout.session.completed" | "checkout.session.expired";
}) {
  return JSON.stringify({
    id: `evt_test_${randomUUID().replaceAll("-", "")}`,
    object: "event",
    api_version: "2025-08-27.basil",
    created: Math.floor(Date.now() / 1000),
    data: { object: session },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type,
  });
}

function createSignedRequest(payload: string) {
  const signature = signatureStripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });
}

beforeAll(async () => {
  previousStripeKey = process.env.STRIPE_SECRET_KEY;
  previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = "sk_test_phase4_route";
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

  await prisma.appointment.deleteMany({
    where: {
      customerEmail: { in: [completedEmail, expiredEmail, underpaidEmail] },
    },
  });
});

afterAll(async () => {
  await prisma.appointment.deleteMany({
    where: {
      customerEmail: { in: [completedEmail, expiredEmail, underpaidEmail] },
    },
  });

  if (previousStripeKey === undefined) {
    delete process.env.STRIPE_SECRET_KEY;
  } else {
    process.env.STRIPE_SECRET_KEY = previousStripeKey;
  }

  if (previousWebhookSecret === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
  }

  await prisma.$disconnect();
});

describe("Stripe webhook endpoint", () => {
  it("rejects a request with an invalid signature", async () => {
    const response = await handleStripeWebhook(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "invalid",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_STRIPE_SIGNATURE" },
    });
  });

  it("confirms and records an authenticated successful payment idempotently", async () => {
    const { appointment, service, sessionId } =
      await createPendingAppointment(completedEmail, 26);
    const paymentIntentId = `pi_test_${randomUUID().replaceAll("-", "")}`;
    const payload = createEventPayload({
      type: "checkout.session.completed",
      session: {
        id: sessionId,
        object: "checkout.session",
        amount_total: service.depositCents,
        currency: service.currency.toLowerCase(),
        metadata: {
          appointmentId: appointment.id,
        },
        mode: "payment",
        payment_intent: paymentIntentId,
        payment_status: "paid",
      },
    });

    const firstResponse = await handleStripeWebhook(
      createSignedRequest(payload),
    );
    const secondResponse = await handleStripeWebhook(
      createSignedRequest(payload),
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    const savedAppointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
      select: {
        status: true,
        paymentStatus: true,
        amountPaidCents: true,
        stripeCheckoutSessionId: true,
        stripePaymentIntentId: true,
      },
    });

    expect(savedAppointment).toEqual({
      status: AppointmentStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      amountPaidCents: service.depositCents,
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: paymentIntentId,
    });
  });

  it("releases a pending appointment after its Checkout Session expires", async () => {
    const { appointment, service, sessionId } =
      await createPendingAppointment(expiredEmail, 28);
    const payload = createEventPayload({
      type: "checkout.session.expired",
      session: {
        id: sessionId,
        object: "checkout.session",
        amount_total: service.depositCents,
        currency: service.currency.toLowerCase(),
        metadata: {
          appointmentId: appointment.id,
        },
        mode: "payment",
        payment_intent: null,
        payment_status: "unpaid",
      },
    });
    const response = await handleStripeWebhook(createSignedRequest(payload));

    expect(response.status).toBe(200);

    const savedAppointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
      select: {
        status: true,
        paymentStatus: true,
        cancellationReason: true,
      },
    });

    expect(savedAppointment.status).toBe(AppointmentStatus.CANCELLED);
    expect(savedAppointment.paymentStatus).toBe(PaymentStatus.FAILED);
    expect(savedAppointment.cancellationReason).toContain("expired");
  });

  it("refuses to confirm an authenticated underpayment", async () => {
    const { appointment, service, sessionId } =
      await createPendingAppointment(underpaidEmail, 30);
    const payload = createEventPayload({
      type: "checkout.session.completed",
      session: {
        id: sessionId,
        object: "checkout.session",
        amount_total: service.depositCents - 1,
        currency: service.currency.toLowerCase(),
        metadata: {
          appointmentId: appointment.id,
        },
        mode: "payment",
        payment_intent: `pi_test_${randomUUID().replaceAll("-", "")}`,
        payment_status: "paid",
      },
    });
    const response = await handleStripeWebhook(createSignedRequest(payload));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "PAYMENT_AMOUNT_MISMATCH" },
    });

    const savedAppointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
      select: {
        status: true,
        paymentStatus: true,
        amountPaidCents: true,
        stripePaymentIntentId: true,
      },
    });

    expect(savedAppointment).toEqual({
      status: AppointmentStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
      amountPaidCents: 0,
      stripePaymentIntentId: null,
    });
  });
});
