import { AppointmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getApplicationUrl } from "@/lib/payments/stripe";

import {
  type AppointmentEmailKind,
  type AppointmentEmailPayload,
  renderAppointmentEmail,
} from "./templates";
import { deliverEmail, type EmailSender } from "./resend";

type NotifyOptions = {
  previousStartsAt?: Date;
  sender?: EmailSender;
};

const appointmentSelect = {
  customerName: true,
  customerEmail: true,
  confirmationCode: true,
  managementToken: true,
  serviceName: true,
  startsAt: true,
  priceCents: true,
  amountPaidCents: true,
  currency: true,
  status: true,
  barber: {
    select: { name: true },
  },
} as const;

function getAppUrl() {
  try {
    return getApplicationUrl();
  } catch {
    return "http://localhost:3000";
  }
}

export function buildManageUrl(token: string, appUrl = getAppUrl()) {
  return `${appUrl}/booking/manage/${token}`;
}

export async function loadAppointmentEmailPayload(
  appointmentId: string,
): Promise<AppointmentEmailPayload | null> {
  const [appointment, settings] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: appointmentSelect,
    }),
    prisma.shopSettings.findUnique({
      where: { id: "default" },
      select: {
        businessName: true,
        phone: true,
        addressLine1: true,
        city: true,
        state: true,
        postalCode: true,
      },
    }),
  ]);

  if (!appointment || !settings) {
    return null;
  }

  return {
    customerName: appointment.customerName,
    confirmationCode: appointment.confirmationCode,
    serviceName: appointment.serviceName,
    barberName: appointment.barber.name ?? "Crown & Blade Barber",
    startsAt: appointment.startsAt,
    priceCents: appointment.priceCents,
    amountPaidCents: appointment.amountPaidCents,
    currency: appointment.currency,
    manageUrl: buildManageUrl(appointment.managementToken),
    businessName: settings.businessName,
    phone: settings.phone,
    address: `${settings.addressLine1}, ${settings.city}, ${settings.state} ${settings.postalCode}`,
  };
}

export async function notifyAppointment(
  kind: AppointmentEmailKind,
  appointmentId: string,
  options: NotifyOptions = {},
) {
  try {
    const settings = await prisma.shopSettings.findUnique({
      where: { id: "default" },
      select: {
        confirmationEmailEnabled: true,
        reminderEmailEnabled: true,
      },
    });
    const isReminder = kind === "reminder_24h" || kind === "reminder_2h";

    if (isReminder && !settings?.reminderEmailEnabled) {
      return { delivered: false as const, reason: "reminders_disabled" };
    }

    if (!isReminder && !settings?.confirmationEmailEnabled) {
      return { delivered: false as const, reason: "confirmations_disabled" };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { customerEmail: true, status: true },
    });

    if (
      isReminder &&
      appointment?.status !== AppointmentStatus.CONFIRMED &&
      appointment?.status !== AppointmentStatus.PENDING
    ) {
      return { delivered: false as const, reason: "not_remindable" };
    }

    const payload = await loadAppointmentEmailPayload(appointmentId);

    if (!payload || !appointment) {
      return { delivered: false as const, reason: "missing_appointment" };
    }

    const email = renderAppointmentEmail(kind, {
      ...payload,
      previousStartsAt: options.previousStartsAt,
    });
    const result = await deliverEmail(
      {
        to: appointment.customerEmail,
        ...email,
      },
      options.sender,
    );

    return result;
  } catch (error) {
    console.error(`Failed to send ${kind} email`, error);
    return { delivered: false as const, reason: "send_failed" };
  }
}
