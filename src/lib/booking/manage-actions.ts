"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { notifyAppointment } from "@/lib/email/notify";
import { consumeRateLimit, publicRateLimits } from "@/lib/security/rate-limit";

import {
  cancelAppointmentByToken,
  getAppointmentByManagementToken,
  ManageBookingError,
  rescheduleAppointmentByToken,
} from "./manage-appointment";

function getManageRedirect(token: string, notice: string) {
  return `/booking/manage/${token}?notice=${notice}`;
}

async function enforceManageRateLimit(token: string) {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    "unknown";
  const limit = consumeRateLimit(
    `manage:${ip}:${token}`,
    publicRateLimits.manage,
  );

  if (!limit.ok) {
    throw new ManageBookingError(
      "NOT_CHANGEABLE",
      "Too many booking changes were attempted. Please wait and try again.",
      429,
    );
  }
}

export async function cancelManagedBookingAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  try {
    await enforceManageRateLimit(token);
    const appointment = await cancelAppointmentByToken(token);
    void notifyAppointment("cancelled", appointment.id);
    revalidatePath(`/booking/manage/${token}`);
    redirect(getManageRedirect(token, "cancelled"));
  } catch (error) {
    if (error instanceof ManageBookingError) {
      redirect(getManageRedirect(token, error.code.toLowerCase()));
    }

    throw error;
  }
}

export async function rescheduleManagedBookingAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const date = String(formData.get("date") ?? "");
  const startsAt = String(formData.get("startsAt") ?? "");

  try {
    await enforceManageRateLimit(token);
    const current = await getAppointmentByManagementToken(token);
    const previousStartsAt = current?.startsAt;
    const appointment = await rescheduleAppointmentByToken({
      token,
      date,
      startsAt,
    });
    void notifyAppointment("rescheduled", appointment.id, {
      previousStartsAt,
    });
    revalidatePath(`/booking/manage/${token}`);
    redirect(getManageRedirect(token, "rescheduled"));
  } catch (error) {
    if (error instanceof ManageBookingError) {
      redirect(getManageRedirect(token, error.code.toLowerCase()));
    }

    throw error;
  }
}
