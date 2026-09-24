import type Stripe from "stripe";
import { z } from "zod";

import {
  AppointmentStatus,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { getRequiredPayment } from "./checkout";

type WebhookDatabase = Pick<Prisma.TransactionClient, "appointment">;

export class StripeWebhookProcessingError extends Error {
  constructor(
    public readonly code:
      | "APPOINTMENT_NOT_FOUND"
      | "APPOINTMENT_NOT_PAYABLE"
      | "INVALID_APPOINTMENT_METADATA"
      | "PAYMENT_AMOUNT_MISMATCH"
      | "PAYMENT_CURRENCY_MISMATCH"
      | "PAYMENT_REFERENCE_MISMATCH"
      | "PAYMENT_REFERENCE_MISSING"
      | "SESSION_MISMATCH",
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "StripeWebhookProcessingError";
  }
}

function getAppointmentId(session: Stripe.Checkout.Session) {
  const parsedId = z.string().uuid().safeParse(session.metadata?.appointmentId);

  if (!parsedId.success) {
    throw new StripeWebhookProcessingError(
      "INVALID_APPOINTMENT_METADATA",
      "Stripe Checkout metadata does not contain a valid appointment ID.",
    );
  }

  return parsedId.data;
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  if (session.payment_intent?.id) {
    return session.payment_intent.id;
  }

  throw new StripeWebhookProcessingError(
    "PAYMENT_REFERENCE_MISSING",
    "The completed Checkout Session has no PaymentIntent reference.",
  );
}

export async function confirmCheckoutSession(
  session: Stripe.Checkout.Session,
  db: WebhookDatabase = prisma,
) {
  if (session.payment_status !== "paid") {
    return { outcome: "ignored_unpaid" as const };
  }

  const appointmentId = getAppointmentId(session);
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      status: true,
      priceCents: true,
      depositCents: true,
      currency: true,
      stripeCheckoutSessionId: true,
      stripePaymentIntentId: true,
    },
  });

  if (!appointment) {
    throw new StripeWebhookProcessingError(
      "APPOINTMENT_NOT_FOUND",
      "The appointment referenced by Stripe does not exist.",
      404,
    );
  }

  if (
    appointment.stripeCheckoutSessionId &&
    appointment.stripeCheckoutSessionId !== session.id
  ) {
    throw new StripeWebhookProcessingError(
      "SESSION_MISMATCH",
      "The Checkout Session does not match this appointment.",
      409,
    );
  }

  if (
    appointment.status !== AppointmentStatus.PENDING_PAYMENT &&
    appointment.status !== AppointmentStatus.CONFIRMED
  ) {
    throw new StripeWebhookProcessingError(
      "APPOINTMENT_NOT_PAYABLE",
      "This appointment can no longer be confirmed by payment.",
      409,
    );
  }

  const requiredPayment = getRequiredPayment(appointment);

  if (session.amount_total !== requiredPayment.amountCents) {
    throw new StripeWebhookProcessingError(
      "PAYMENT_AMOUNT_MISMATCH",
      "The Stripe payment amount does not match the appointment.",
      409,
    );
  }

  if (session.currency?.toUpperCase() !== appointment.currency.toUpperCase()) {
    throw new StripeWebhookProcessingError(
      "PAYMENT_CURRENCY_MISMATCH",
      "The Stripe payment currency does not match the appointment.",
      409,
    );
  }

  const paymentIntentId = getPaymentIntentId(session);

  if (
    appointment.stripePaymentIntentId &&
    appointment.stripePaymentIntentId !== paymentIntentId
  ) {
    throw new StripeWebhookProcessingError(
      "PAYMENT_REFERENCE_MISMATCH",
      "The PaymentIntent does not match the payment already recorded.",
      409,
    );
  }

  const update = await db.appointment.updateMany({
    where: {
      id: appointment.id,
      status: {
        in: [
          AppointmentStatus.PENDING_PAYMENT,
          AppointmentStatus.CONFIRMED,
        ],
      },
      OR: [
        { stripeCheckoutSessionId: null },
        { stripeCheckoutSessionId: session.id },
      ],
    },
    data: {
      status: AppointmentStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      amountPaidCents: requiredPayment.amountCents,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
    },
  });

  if (update.count !== 1) {
    throw new StripeWebhookProcessingError(
      "APPOINTMENT_NOT_PAYABLE",
      "The appointment changed before payment could be recorded.",
      409,
    );
  }

  return {
    outcome:
      appointment.status === AppointmentStatus.CONFIRMED
        ? ("already_confirmed" as const)
        : ("confirmed" as const),
    appointmentId: appointment.id,
  };
}

export async function cancelExpiredCheckoutSession(
  session: Stripe.Checkout.Session,
  db: WebhookDatabase = prisma,
) {
  const appointmentId = getAppointmentId(session);
  const update = await db.appointment.updateMany({
    where: {
      id: appointmentId,
      status: AppointmentStatus.PENDING_PAYMENT,
      stripeCheckoutSessionId: session.id,
    },
    data: {
      status: AppointmentStatus.CANCELLED,
      paymentStatus: PaymentStatus.FAILED,
      cancellationReason: "Stripe Checkout session expired before payment.",
      cancelledAt: new Date(),
    },
  });

  return {
    outcome: update.count === 1 ? ("cancelled" as const) : ("ignored" as const),
    appointmentId,
  };
}
