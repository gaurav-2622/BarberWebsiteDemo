import { NextResponse } from "next/server";

import {
  isAuthorizedCronRequest,
  processAppointmentReminders,
} from "@/lib/email/reminders";
import { getPublicErrorMessage } from "@/lib/security/public-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function readCronSecret(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return request.headers.get("x-cron-secret");
}

async function handleReminderRequest(request: Request) {
  if (!isAuthorizedCronRequest(readCronSecret(request))) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "A valid reminder secret is required.",
        },
      },
      { status: 401 },
    );
  }

  try {
    const result = await processAppointmentReminders();

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Failed to process appointment reminders", error);

    return NextResponse.json(
      {
        error: {
          code: "REMINDER_ERROR",
          message: getPublicErrorMessage(
            error,
            "Reminders could not be processed.",
          ),
        },
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleReminderRequest(request);
}

export async function POST(request: Request) {
  return handleReminderRequest(request);
}
