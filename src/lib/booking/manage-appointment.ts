import {
  AppointmentStatus,
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { AvailabilityError, getAvailability } from "./availability";
import { BookingError } from "./create-appointment";
import {
  canCustomerChangeAppointment,
  isCustomerManageableStatus,
} from "./policy";
import { isSameShopDate, SHOP_TIME_ZONE } from "./time";
import { isManagementToken } from "./tokens";

export class ManageBookingError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "NOT_CHANGEABLE"
      | "POLICY_WINDOW"
      | "INVALID_TIME"
      | "SLOT_UNAVAILABLE",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ManageBookingError";
  }
}

const appointmentManageSelect = {
  id: true,
  confirmationCode: true,
  managementToken: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  serviceId: true,
  serviceName: true,
  serviceDurationMinutes: true,
  serviceBufferMinutes: true,
  barberId: true,
  startsAt: true,
  endsAt: true,
  timeZone: true,
  status: true,
  priceCents: true,
  depositCents: true,
  amountPaidCents: true,
  currency: true,
  paymentStatus: true,
  customerNotes: true,
  barber: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export async function getAppointmentByManagementToken(token: string) {
  if (!isManagementToken(token)) {
    return null;
  }

  return prisma.appointment.findUnique({
    where: { managementToken: token },
    select: appointmentManageSelect,
  });
}

export async function getManagePolicy() {
  return prisma.shopSettings.findUniqueOrThrow({
    where: { id: "default" },
    select: {
      businessName: true,
      phone: true,
      cancellationWindowHours: true,
      bookingWindowDays: true,
      bookingEnabled: true,
    },
  });
}

export async function cancelAppointmentByToken(
  token: string,
  now = new Date(),
) {
  const appointment = await getAppointmentByManagementToken(token);
  const settings = await getManagePolicy();

  if (!appointment) {
    throw new ManageBookingError(
      "NOT_FOUND",
      "This booking link is invalid or has expired.",
      404,
    );
  }

  if (!isCustomerManageableStatus(appointment.status)) {
    throw new ManageBookingError(
      "NOT_CHANGEABLE",
      "This appointment can no longer be cancelled online.",
      409,
    );
  }

  if (
    !canCustomerChangeAppointment(
      appointment.startsAt,
      settings.cancellationWindowHours,
      now,
    )
  ) {
    throw new ManageBookingError(
      "POLICY_WINDOW",
      `Online cancellations must be made at least ${settings.cancellationWindowHours} hours before the appointment.`,
      409,
    );
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: AppointmentStatus.CANCELLED,
      cancellationReason: "Cancelled by customer.",
      cancelledAt: now,
    },
    select: appointmentManageSelect,
  });

  return updated;
}

export async function rescheduleAppointmentByToken({
  token,
  date,
  startsAt,
  now = new Date(),
}: {
  token: string;
  date: string;
  startsAt: string;
  now?: Date;
}) {
  const requestedStart = new Date(startsAt);

  if (
    Number.isNaN(requestedStart.getTime()) ||
    !isSameShopDate(requestedStart, date)
  ) {
    throw new ManageBookingError(
      "INVALID_TIME",
      "The selected time does not match the selected date.",
      400,
    );
  }

  const appointment = await getAppointmentByManagementToken(token);
  const settings = await getManagePolicy();

  if (!appointment) {
    throw new ManageBookingError(
      "NOT_FOUND",
      "This booking link is invalid or has expired.",
      404,
    );
  }

  if (!isCustomerManageableStatus(appointment.status)) {
    throw new ManageBookingError(
      "NOT_CHANGEABLE",
      "This appointment can no longer be rescheduled online.",
      409,
    );
  }

  if (
    !canCustomerChangeAppointment(
      appointment.startsAt,
      settings.cancellationWindowHours,
      now,
    )
  ) {
    throw new ManageBookingError(
      "POLICY_WINDOW",
      `Online rescheduling must be made at least ${settings.cancellationWindowHours} hours before the appointment.`,
      409,
    );
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const lockKey = `booking:${date}`;

        await tx.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${lockKey}))::text
        `;

        const availability = await getAvailability({
          serviceId: appointment.serviceId,
          barberId: appointment.barberId,
          date,
          now,
          db: tx,
          excludeAppointmentId: appointment.id,
        });
        const requestedIso = requestedStart.toISOString();
        const availableSlot = availability.slots.find(
          (slot) => slot.start === requestedIso,
        );

        if (!availableSlot) {
          throw new ManageBookingError(
            "SLOT_UNAVAILABLE",
            "That time was just taken. Please choose another available slot.",
            409,
          );
        }

        return tx.appointment.update({
          where: { id: appointment.id },
          data: {
            startsAt: requestedStart,
            endsAt: new Date(availableSlot.end),
            timeZone: SHOP_TIME_ZONE,
            cancellationReason: null,
            cancelledAt: null,
          },
          select: appointmentManageSelect,
        });
      },
      {
        maxWait: 5_000,
        timeout: 10_000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );
  } catch (error) {
    if (error instanceof ManageBookingError) {
      throw error;
    }

    if (error instanceof AvailabilityError || error instanceof BookingError) {
      throw new ManageBookingError(
        "SLOT_UNAVAILABLE",
        error.message,
        error.status,
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2004", "P2034"].includes(error.code)
    ) {
      throw new ManageBookingError(
        "SLOT_UNAVAILABLE",
        "That time was just taken. Please choose another available slot.",
        409,
      );
    }

    throw error;
  }
}
