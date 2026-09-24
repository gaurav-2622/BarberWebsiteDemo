import { NextResponse } from "next/server";

import {
  AvailabilityError,
  getAvailability,
} from "@/lib/booking/availability";
import { availabilityQuerySchema } from "@/lib/booking/schemas";
import {
  consumeRateLimit,
  getRequestIp,
  publicRateLimits,
} from "@/lib/security/rate-limit";
import { getPublicErrorMessage } from "@/lib/security/public-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const parsedQuery = availabilityQuerySchema.safeParse({
    serviceId: url.searchParams.get("serviceId"),
    barberId: url.searchParams.get("barberId") ?? "any",
    date: url.searchParams.get("date"),
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the selected service, barber, and date.",
          fields: parsedQuery.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const availability = await getAvailability({
      serviceId: parsedQuery.data.serviceId,
      barberId:
        parsedQuery.data.barberId === "any"
          ? undefined
          : parsedQuery.data.barberId,
      date: parsedQuery.data.date,
    });

    return NextResponse.json(availability, {
      headers: {
        "Cache-Control": "no-store",
      },
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

    console.error("Failed to calculate availability", error);

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
