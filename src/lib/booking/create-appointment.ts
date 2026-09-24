import { randomBytes } from "node:crypto";

import {
  AppointmentStatus,
  BookingSource,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { AvailabilityError, getAvailability } from "./availability";
import type { CreateAppointmentInput } from "./schemas";
import { isSameShopDate, SHOP_TIME_ZONE } from "./time";
import { createManagementToken } from "./tokens";

export class BookingError extends Error {
  constructor(
    public readonly code:
      | "INVALID_TIME"
      | "SLOT_UNAVAILABLE"
      | "BOOKING_UNAVAILABLE",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

function createConfirmationCode(date: string) {
  const compactDate = date.replaceAll("-", "").slice(2);
  const randomCode = randomBytes(3).toString("hex").toUpperCase();

  return `CB-${compactDate}-${randomCode}`;
}

export async function createAppointment(input: CreateAppointmentInput) {
  const requestedStart = new Date(input.startsAt);

  if (
    Number.isNaN(requestedStart.getTime()) ||
    !isSameShopDate(requestedStart, input.date)
  ) {
    throw new BookingError(
      "INVALID_TIME",
      "The selected time does not match the selected date.",
      400,
    );
  }

  const now = new Date();

  try {
    return await prisma.$transaction(
      async (tx) => {
        const lockKey = `booking:${input.date}`;

        await tx.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${lockKey}))::text
        `;

        const availability = await getAvailability({
          serviceId: input.serviceId,
          barberId: input.barberId === "any" ? undefined : input.barberId,
          date: input.date,
          now,
          db: tx,
        });
        const requestedIso = requestedStart.toISOString();
        const availableSlot = availability.slots.find(
          (slot) => slot.start === requestedIso,
        );

        if (!availableSlot) {
          throw new BookingError(
            "SLOT_UNAVAILABLE",
            "That time was just taken. Please choose another available slot.",
            409,
          );
        }

        const assignedBarberId =
          input.barberId === "any"
            ? availableSlot.barberIds[0]
            : input.barberId;

        if (!assignedBarberId) {
          throw new BookingError(
            "SLOT_UNAVAILABLE",
            "No barber is available for that time.",
            409,
          );
        }

        const service = await tx.service.findUniqueOrThrow({
          where: { id: input.serviceId },
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            bufferMinutes: true,
            priceCents: true,
            depositCents: true,
            currency: true,
          },
        });
        const barber = await tx.user.findUniqueOrThrow({
          where: { id: assignedBarberId },
          select: {
            id: true,
            name: true,
          },
        });
        const appointment = await tx.appointment.create({
          data: {
            confirmationCode: createConfirmationCode(input.date),
            managementToken: createManagementToken(),
            barberId: barber.id,
            serviceId: service.id,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
            serviceName: service.name,
            serviceDurationMinutes: service.durationMinutes,
            serviceBufferMinutes: service.bufferMinutes,
            startsAt: requestedStart,
            endsAt: new Date(availableSlot.end),
            timeZone: SHOP_TIME_ZONE,
            status: AppointmentStatus.PENDING_PAYMENT,
            bookingSource: BookingSource.WEBSITE,
            priceCents: service.priceCents,
            depositCents: service.depositCents,
            amountPaidCents: 0,
            currency: service.currency,
            paymentStatus: PaymentStatus.PENDING,
            customerNotes: input.customerNotes || null,
          },
          select: {
            id: true,
            confirmationCode: true,
            managementToken: true,
            customerEmail: true,
            startsAt: true,
            endsAt: true,
            timeZone: true,
            status: true,
            priceCents: true,
            depositCents: true,
            currency: true,
          },
        });

        return {
          ...appointment,
          service: {
            id: service.id,
            name: service.name,
            durationMinutes: service.durationMinutes,
          },
          barber,
        };
      },
      {
        maxWait: 5_000,
        timeout: 10_000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );
  } catch (error) {
    if (error instanceof BookingError) {
      throw error;
    }

    if (error instanceof AvailabilityError) {
      throw new BookingError(
        "BOOKING_UNAVAILABLE",
        error.message,
        error.status,
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2004", "P2034"].includes(error.code)
    ) {
      throw new BookingError(
        "SLOT_UNAVAILABLE",
        "That time was just taken. Please choose another available slot.",
        409,
      );
    }

    throw error;
  }
}
