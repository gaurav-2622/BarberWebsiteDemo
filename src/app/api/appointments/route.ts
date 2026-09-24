import { NextResponse } from "next/server";

import { BookingError } from "@/lib/booking/create-appointment";
import { createAppointmentSchema } from "@/lib/booking/schemas";
import {
  CheckoutError,
  createBookingCheckout,
} from "@/lib/payments/checkout";
import { StripeConfigurationError } from "@/lib/payments/stripe";
import {
  consumeRateLimit,
  getRequestIp,
  publicRateLimits,
} from "@/lib/security/rate-limit";
import { getPublicErrorMessage } from "@/lib/security/public-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = consumeRateLimit(
    `appointments:${getRequestIp(request)}`,
    publicRateLimits.appointments,
  );

  if (!limit.ok) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many booking attempts. Please wait and try again.",
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "The booking request is not valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  const parsedBody = createAppointmentSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the booking details and try again.",
          fields: parsedBody.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const checkout = await createBookingCheckout(parsedBody.data);

    return NextResponse.json(
      {
        checkoutUrl: checkout.checkoutUrl,
        appointmentId: checkout.appointment.id,
        paymentAmountCents: checkout.paymentAmountCents,
        paymentKind: checkout.paymentKind,
        message: "Your appointment is being held while you complete payment.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BookingError) {
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

    if (error instanceof CheckoutError) {
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

    if (error instanceof StripeConfigurationError) {
      return NextResponse.json(
        {
          error: {
            code: "PAYMENTS_NOT_CONFIGURED",
            message: "Secure checkout is not configured.",
          },
        },
        { status: 503 },
      );
    }

    console.error("Failed to create appointment", error);

    return NextResponse.json(
      {
        error: {
          code: "BOOKING_ERROR",
          message: getPublicErrorMessage(
            error,
            "Your appointment could not be saved. Please try again.",
          ),
        },
      },
      { status: 500 },
    );
  }
}
