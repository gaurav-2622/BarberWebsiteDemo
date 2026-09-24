import type Stripe from "stripe";

import {
  AppointmentStatus,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client";
import { createAppointment } from "@/lib/booking/create-appointment";
import type { CreateAppointmentInput } from "@/lib/booking/schemas";
import { prisma } from "@/lib/prisma";

import { notifyAppointment } from "@/lib/email/notify";

import {
  getApplicationUrl,
  getStripeClient,
  StripeConfigurationError,
} from "./stripe";

type CheckoutDatabase = Pick<
  Prisma.TransactionClient,
  "appointment" | "shopSettings"
>;

type CheckoutOptions = {
  appUrl?: string;
  createBooking?: typeof createAppointment;
  db?: CheckoutDatabase;
  now?: Date;
  stripe?: Stripe;
};

export type CheckoutPaymentKind = "deposit" | "full_balance";

export class CheckoutError extends Error {
  constructor(
    public readonly code:
      | "CHECKOUT_UNAVAILABLE"
      | "PAYMENT_AMOUNT_INVALID"
      | "PAYMENTS_DISABLED",
    message: string,
    public readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CheckoutError";
  }
}

export function getRequiredPayment({
  depositCents,
  priceCents,
}: {
  depositCents: number;
  priceCents: number;
}) {
  const amountCents = depositCents > 0 ? depositCents : priceCents;
  const kind: CheckoutPaymentKind =
    depositCents > 0 && depositCents < priceCents
      ? "deposit"
      : "full_balance";

  return { amountCents, kind };
}

async function releaseAppointment(
  db: CheckoutDatabase,
  appointmentId: string,
  now: Date,
  reason: string,
) {
  await db.appointment.updateMany({
    where: {
      id: appointmentId,
      status: AppointmentStatus.PENDING_PAYMENT,
    },
    data: {
      status: AppointmentStatus.CANCELLED,
      paymentStatus: PaymentStatus.FAILED,
      cancellationReason: reason,
      cancelledAt: now,
    },
  });
}

async function expireSessionAndReleaseAppointment({
  appointmentId,
  db,
  now,
  sessionId,
  stripe,
}: {
  appointmentId: string;
  db: CheckoutDatabase;
  now: Date;
  sessionId: string;
  stripe: Stripe;
}) {
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch {
    return;
  }

  await releaseAppointment(
    db,
    appointmentId,
    now,
    "Stripe Checkout could not be linked to this appointment.",
  );
}

export async function createBookingCheckout(
  input: CreateAppointmentInput,
  options: CheckoutOptions = {},
) {
  const db = options.db ?? prisma;
  const paymentsEnabled = await db.shopSettings.findUnique({
    where: { id: "default" },
    select: { onlinePaymentsEnabled: true },
  });

  if (!paymentsEnabled?.onlinePaymentsEnabled) {
    throw new CheckoutError(
      "PAYMENTS_DISABLED",
      "Online payments are currently unavailable.",
      503,
    );
  }

  let stripe: Stripe;
  let appUrl: string;

  try {
    stripe = options.stripe ?? getStripeClient();
    appUrl = options.appUrl ?? getApplicationUrl();
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      throw error;
    }

    throw new CheckoutError(
      "CHECKOUT_UNAVAILABLE",
      "Secure checkout is currently unavailable.",
      503,
      { cause: error },
    );
  }

  const createBooking = options.createBooking ?? createAppointment;
  const now = options.now ?? new Date();
  const appointment = await createBooking(input);
  const payment = getRequiredPayment(appointment);

  if (!Number.isInteger(payment.amountCents) || payment.amountCents <= 0) {
    await releaseAppointment(
      db,
      appointment.id,
      now,
      "No payable amount was configured for this service.",
    );

    throw new CheckoutError(
      "PAYMENT_AMOUNT_INVALID",
      "This service does not have a valid online payment amount.",
      422,
    );
  }

  const metadata = {
    appointmentId: appointment.id,
    confirmationCode: appointment.confirmationCode,
    paymentKind: payment.kind,
  };
  const sessionParameters: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: input.customerEmail,
    client_reference_id: appointment.id,
    expires_at: Math.floor(now.getTime() / 1000) + 31 * 60,
    success_url: `${appUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/book?payment=cancelled`,
    metadata,
    payment_intent_data: {
      metadata,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: appointment.currency.toLowerCase(),
          unit_amount: payment.amountCents,
          product_data: {
            name:
              payment.kind === "deposit"
                ? `${appointment.service.name} deposit`
                : appointment.service.name,
            description:
              payment.kind === "deposit"
                ? `Deposit for appointment ${appointment.confirmationCode}`
                : `Full payment for appointment ${appointment.confirmationCode}`,
          },
        },
      },
    ],
    submit_type: "book",
  };
  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.create(sessionParameters, {
      idempotencyKey: `booking-checkout:${appointment.id}`,
    });
  } catch (error) {
    await releaseAppointment(
      db,
      appointment.id,
      now,
      "Stripe Checkout session creation failed.",
    );

    throw new CheckoutError(
      "CHECKOUT_UNAVAILABLE",
      "Secure checkout could not be started. Please choose your time again.",
      502,
      { cause: error },
    );
  }

  if (!session.url) {
    await expireSessionAndReleaseAppointment({
      appointmentId: appointment.id,
      db,
      now,
      sessionId: session.id,
      stripe,
    });

    throw new CheckoutError(
      "CHECKOUT_UNAVAILABLE",
      "Stripe did not return a secure checkout URL.",
      502,
    );
  }

  try {
    const linkedAppointment = await db.appointment.updateMany({
      where: {
        id: appointment.id,
        status: AppointmentStatus.PENDING_PAYMENT,
        stripeCheckoutSessionId: null,
      },
      data: {
        stripeCheckoutSessionId: session.id,
      },
    });

    if (linkedAppointment.count !== 1) {
      throw new Error("The appointment is no longer pending payment.");
    }
  } catch (error) {
    await expireSessionAndReleaseAppointment({
      appointmentId: appointment.id,
      db,
      now,
      sessionId: session.id,
      stripe,
    });

    throw new CheckoutError(
      "CHECKOUT_UNAVAILABLE",
      "Secure checkout could not be linked to the appointment.",
      502,
      { cause: error },
    );
  }

  void notifyAppointment("booking_confirmation", appointment.id);

  return {
    appointment,
    checkoutSessionId: session.id,
    checkoutUrl: session.url,
    paymentAmountCents: payment.amountCents,
    paymentKind: payment.kind,
  };
}
