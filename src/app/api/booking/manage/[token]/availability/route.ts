import { NextResponse } from "next/server";

import { AvailabilityError, getAvailability } from "@/lib/booking/availability";
import { getAppointmentByManagementToken } from "@/lib/booking/manage-appointment";
import { availabilityQuerySchema } from "@/lib/booking/schemas";
import { getRequestIp, consumeRateLimit, publicRateLimits } from "@/lib/security/rate-limit";
import { getPublicErrorMessage } from "@/lib/security/public-error";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const limit = consumeRateLimit(
    `availability:${getRequestIp(request)}`,
    publicRateLimits.availability,
  );

  if (!limit.ok) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many availability checks. Please wait and try again.",
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const { token } = await context.params;
  const appointment = await getAppointmentByManagementToken(token);

  if (!appointment) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "This booking link is invalid or has expired.",
        },
      },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const parsedQuery = availabilityQuerySchema.safeParse({
    serviceId: appointment.serviceId,
    barberId: appointment.barberId,
    date: url.searchParams.get("date"),
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Choose a valid date to check open times.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const availability = await getAvailability({
      serviceId: appointment.serviceId,
      barberId: appointment.barberId,
      date: parsedQuery.data.date,
      excludeAppointmentId: appointment.id,
    });

    return NextResponse.json(availability, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AvailabilityError) {
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

    console.error("Failed to load managed availability", error);

    return NextResponse.json(
      {
        error: {
          code: "AVAILABILITY_ERROR",
          message: getPublicErrorMessage(
            error,
            "Availability could not be loaded. Please try again.",
          ),
        },
      },
      { status: 500 },
    );
  }
}
