import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  cancelExpiredCheckoutSession,
  confirmCheckoutSession,
  StripeWebhookProcessingError,
} from "@/lib/payments/webhook";
import { notifyAppointment } from "@/lib/email/notify";
import {
  getStripeClient,
  getStripeWebhookSecret,
  StripeConfigurationError,
} from "@/lib/payments/stripe";
import { getPublicErrorMessage } from "@/lib/security/public-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        error: {
          code: "MISSING_STRIPE_SIGNATURE",
          message: "The Stripe signature header is required.",
        },
      },
      { status: 400 },
    );
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      payload,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      return NextResponse.json(
        {
          error: {
            code: "STRIPE_WEBHOOK_NOT_CONFIGURED",
            message: "Stripe webhook verification is not configured.",
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INVALID_STRIPE_SIGNATURE",
          message: "The Stripe webhook signature is invalid.",
        },
      },
      { status: 400 },
    );
  }

  try {
    let result:
      | Awaited<ReturnType<typeof cancelExpiredCheckoutSession>>
      | Awaited<ReturnType<typeof confirmCheckoutSession>>
      | { outcome: "ignored_event" };

    switch (event.type) {
      case "checkout.session.completed":
        result = await confirmCheckoutSession(event.data.object);
        if (result.outcome === "confirmed") {
          void notifyAppointment("deposit_paid", result.appointmentId);
        }
        break;
      case "checkout.session.expired":
        result = await cancelExpiredCheckoutSession(event.data.object);
        if (result.outcome === "cancelled") {
          void notifyAppointment("cancelled", result.appointmentId);
        }
        break;
      default:
        result = { outcome: "ignored_event" };
    }

    return NextResponse.json({ received: true, result });
  } catch (error) {
    if (error instanceof StripeWebhookProcessingError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status },
      );
    }

    console.error("Failed to process Stripe webhook", error);

    return NextResponse.json(
      {
        error: {
          code: "STRIPE_WEBHOOK_ERROR",
          message: getPublicErrorMessage(
            error,
            "The Stripe webhook could not be processed.",
          ),
        },
      },
      { status: 500 },
    );
  }
}
