import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import {
  AppointmentStatus,
  PaymentStatus,
  UserRole,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { getAvailability } from "./availability";
import {
  cancelAppointmentByToken,
  ManageBookingError,
  rescheduleAppointmentByToken,
} from "./manage-appointment";
import { getDayOfWeek, getShopDateKey, shiftDateKey } from "./time";
import { createManagementToken } from "./tokens";

const testEmail = "phase6-manage-test@example.com";

afterAll(async () => {
  await prisma.appointment.deleteMany({
    where: { customerEmail: testEmail },
  });
  await prisma.$disconnect();
});

async function getSeedBookingData() {
  const [service, barber] = await Promise.all([
    prisma.service.findUnique({
      where: { slug: "signature-haircut" },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        bufferMinutes: true,
        priceCents: true,
        depositCents: true,
        currency: true,
      },
    }),
    prisma.user.findFirst({
      where: {
        email: "owner@crownandblade.example",
        isActive: true,
        role: { in: [UserRole.OWNER, UserRole.BARBER] },
      },
      select: { id: true },
    }),
  ]);

  if (!service || !barber) {
    throw new Error("Phase 6 tests require the seed data.");
  }

  return { service, barber };
}

function getFutureOpenDate(daysAhead: number) {
  let date = shiftDateKey(getShopDateKey(), daysAhead);

  while (getDayOfWeek(date) === 0) {
    date = shiftDateKey(date, 1);
  }

  return date;
}

describe("customer appointment management", () => {
  it("reschedules an appointment onto an open slot and then cancels it", async () => {
    const { service, barber } = await getSeedBookingData();
    const date = getFutureOpenDate(8);
    const nextDate = getFutureOpenDate(9);
    const availability = await getAvailability({
      serviceId: service.id,
      barberId: barber.id,
      date,
    });
    const nextAvailability = await getAvailability({
      serviceId: service.id,
      barberId: barber.id,
      date: nextDate,
    });
    const slot = availability.slots[0];
    const nextSlot = nextAvailability.slots[1] ?? nextAvailability.slots[0];

    if (!slot || !nextSlot) {
      throw new Error("Expected open slots for the management test.");
    }

    const token = createManagementToken();
    const appointment = await prisma.appointment.create({
      data: {
        confirmationCode: `CB-P6-${randomUUID().slice(0, 8).toUpperCase()}`,
        managementToken: token,
        barberId: barber.id,
        serviceId: service.id,
        customerName: "Phase Six Manage Test",
        customerEmail: testEmail,
        customerPhone: "+1-212-555-0166",
        serviceName: service.name,
        serviceDurationMinutes: service.durationMinutes,
        serviceBufferMinutes: service.bufferMinutes,
        startsAt: new Date(slot.start),
        endsAt: new Date(slot.end),
        status: AppointmentStatus.CONFIRMED,
        priceCents: service.priceCents,
        depositCents: service.depositCents,
        amountPaidCents: service.depositCents,
        currency: service.currency,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    const rescheduled = await rescheduleAppointmentByToken({
      token,
      date: nextDate,
      startsAt: nextSlot.start,
    });

    expect(rescheduled.id).toBe(appointment.id);
    expect(rescheduled.startsAt.toISOString()).toBe(nextSlot.start);

    const cancelled = await cancelAppointmentByToken(token);

    expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);
    await expect(cancelAppointmentByToken(token)).rejects.toBeInstanceOf(
      ManageBookingError,
    );
  });

  it("rejects an invalid management token", async () => {
    await expect(cancelAppointmentByToken("not-a-valid-token")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
