import {
  AppointmentStatus,
  Prisma,
  UserRole,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import {
  addBookingMinutes,
  formatSlotTime,
  fromShopTime,
  getDayOfWeek,
  getShopDayBounds,
  isDateWithinBookingWindow,
  rangesOverlap,
  SHOP_TIME_ZONE,
} from "./time";

export const ACTIVE_BOOKING_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.PENDING_PAYMENT,
  AppointmentStatus.CONFIRMED,
] as const;

type AvailabilityDatabase = Pick<
  Prisma.TransactionClient,
  | "appointment"
  | "blockedTime"
  | "service"
  | "shopSettings"
  | "user"
  | "workingHour"
>;

export type AvailabilitySlot = {
  start: string;
  end: string;
  label: string;
  barberIds: string[];
};

export type AvailabilityResult = {
  date: string;
  timeZone: typeof SHOP_TIME_ZONE;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    bufferMinutes: number;
  };
  slots: AvailabilitySlot[];
};

export class AvailabilityError extends Error {
  constructor(
    public readonly code:
      | "BOOKING_DISABLED"
      | "DATE_OUT_OF_RANGE"
      | "SERVICE_NOT_FOUND"
      | "BARBER_NOT_AVAILABLE",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AvailabilityError";
  }
}

type GetAvailabilityInput = {
  serviceId: string;
  date: string;
  barberId?: string;
  now?: Date;
  db?: AvailabilityDatabase;
  excludeAppointmentId?: string;
};

export async function getAvailability({
  serviceId,
  date,
  barberId,
  now = new Date(),
  db = prisma,
  excludeAppointmentId,
}: GetAvailabilityInput): Promise<AvailabilityResult> {
  const settings = await db.shopSettings.findUnique({
    where: { id: "default" },
    select: {
      bookingEnabled: true,
      bookingWindowDays: true,
      minimumLeadTimeMinutes: true,
      slotIntervalMinutes: true,
    },
  });
  const service = await db.service.findFirst({
    where: {
      id: serviceId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      bufferMinutes: true,
    },
  });

  if (!settings?.bookingEnabled) {
    throw new AvailabilityError(
      "BOOKING_DISABLED",
      "Online booking is currently unavailable.",
      503,
    );
  }

  if (!service) {
    throw new AvailabilityError(
      "SERVICE_NOT_FOUND",
      "The selected service is not available.",
      404,
    );
  }

  if (!isDateWithinBookingWindow(date, settings.bookingWindowDays, now)) {
    throw new AvailabilityError(
      "DATE_OUT_OF_RANGE",
      "Choose a date within the current booking window.",
      400,
    );
  }

  const dayOfWeek = getDayOfWeek(date);
  const dayBounds = getShopDayBounds(date);
  const barbers = await db.user.findMany({
    where: {
      ...(barberId ? { id: barberId } : {}),
      isActive: true,
      role: { in: [UserRole.OWNER, UserRole.BARBER] },
      barberServices: {
        some: {
          serviceId,
          isActive: true,
        },
      },
    },
    orderBy: [{ role: "desc" }, { name: "asc" }],
    select: {
      id: true,
    },
  });

  if (barberId && barbers.length === 0) {
    throw new AvailabilityError(
      "BARBER_NOT_AVAILABLE",
      "The selected barber does not offer this service.",
      404,
    );
  }

  const barberIds = barbers.map((barber) => barber.id);
  const workingHours = await db.workingHour.findMany({
    where: {
      barberId: { in: barberIds },
      dayOfWeek,
      isActive: true,
    },
    select: {
      barberId: true,
      startMinute: true,
      endMinute: true,
    },
  });
  const blockedTimes = await db.blockedTime.findMany({
    where: {
      barberId: { in: barberIds },
      startsAt: { lt: dayBounds.endsAt },
      endsAt: { gt: dayBounds.startsAt },
    },
    select: {
      barberId: true,
      startsAt: true,
      endsAt: true,
    },
  });
  const appointments = await db.appointment.findMany({
    where: {
      barberId: { in: barberIds },
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      startsAt: { lt: dayBounds.endsAt },
      endsAt: { gt: dayBounds.startsAt },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: {
      barberId: true,
      startsAt: true,
      endsAt: true,
    },
  });
  const workingHoursByBarber = new Map(
    workingHours.map((schedule) => [schedule.barberId, schedule]),
  );
  const blockedTimesByBarber = new Map<
    string,
    Array<{ startsAt: Date; endsAt: Date }>
  >();
  const appointmentsByBarber = new Map<
    string,
    Array<{ startsAt: Date; endsAt: Date }>
  >();

  for (const blockedTime of blockedTimes) {
    const entries = blockedTimesByBarber.get(blockedTime.barberId) ?? [];
    entries.push(blockedTime);
    blockedTimesByBarber.set(blockedTime.barberId, entries);
  }

  for (const appointment of appointments) {
    const entries = appointmentsByBarber.get(appointment.barberId) ?? [];
    entries.push(appointment);
    appointmentsByBarber.set(appointment.barberId, entries);
  }

  const occupiedMinutes = service.durationMinutes + service.bufferMinutes;
  const leadTimeThreshold = addBookingMinutes(
    now,
    settings.minimumLeadTimeMinutes,
  );
  const slotsByStart = new Map<
    string,
    { start: Date; end: Date; barberIds: string[] }
  >();

  for (const barber of barbers) {
    const schedule = workingHoursByBarber.get(barber.id);

    if (!schedule) {
      continue;
    }

    for (
      let minute = schedule.startMinute;
      minute + occupiedMinutes <= schedule.endMinute;
      minute += settings.slotIntervalMinutes
    ) {
      const startsAt = fromShopTime(date, minute);
      const endsAt = addBookingMinutes(startsAt, occupiedMinutes);

      if (startsAt < leadTimeThreshold) {
        continue;
      }

      const conflictsWithAppointment = (
        appointmentsByBarber.get(barber.id) ?? []
      ).some((appointment) =>
        rangesOverlap(
          startsAt,
          endsAt,
          appointment.startsAt,
          appointment.endsAt,
        ),
      );
      const conflictsWithBlockedTime = (
        blockedTimesByBarber.get(barber.id) ?? []
      ).some((blockedTime) =>
        rangesOverlap(
          startsAt,
          endsAt,
          blockedTime.startsAt,
          blockedTime.endsAt,
        ),
      );

      if (conflictsWithAppointment || conflictsWithBlockedTime) {
        continue;
      }

      const key = startsAt.toISOString();
      const existingSlot = slotsByStart.get(key);

      if (existingSlot) {
        existingSlot.barberIds.push(barber.id);
      } else {
        slotsByStart.set(key, {
          start: startsAt,
          end: endsAt,
          barberIds: [barber.id],
        });
      }
    }
  }

  const slots = [...slotsByStart.values()]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      label: formatSlotTime(slot.start),
      barberIds: slot.barberIds,
    }));

  return {
    date,
    timeZone: SHOP_TIME_ZONE,
    service,
    slots,
  };
}
