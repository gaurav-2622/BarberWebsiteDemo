import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import {
  AppointmentStatus,
  BookingSource,
  PaymentStatus,
  UserRole,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { getAvailability } from "./availability";
import { BookingError, createAppointment } from "./create-appointment";
import { createManagementToken } from "./tokens";
import {
  getDayOfWeek,
  getShopDateKey,
  shiftDateKey,
  SHOP_TIME_ZONE,
} from "./time";

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
    throw new Error("Phase 3 integration tests require the Phase 1 seed data.");
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

afterAll(async () => {
  await prisma.$disconnect();
});

describe("database-backed availability", () => {
  it("removes a slot occupied by an active appointment", async () => {
    const { service, barber } = await getSeedBookingData();
    const date = getFutureOpenDate(7);
    const now = new Date();
    const testEmail = "phase3-availability-test@example.com";

    await prisma.appointment.deleteMany({ where: { customerEmail: testEmail } });

    const initialAvailability = await getAvailability({
      serviceId: service.id,
      barberId: barber.id,
      date,
      now,
    });
    const slot = initialAvailability.slots[0];

    expect(initialAvailability.timeZone).toBe(SHOP_TIME_ZONE);
    expect(initialAvailability.service.bufferMinutes).toBe(
      service.bufferMinutes,
    );
    expect(slot).toBeDefined();
    expect(initialAvailability.slots.length).toBeGreaterThan(1);

    if (!slot) {
      throw new Error("Expected at least one seeded booking slot.");
    }

    expect(new Date(slot.end).getTime() - new Date(slot.start).getTime()).toBe(
      (service.durationMinutes + service.bufferMinutes) * 60_000,
    );
    expect(
      new Date(initialAvailability.slots[1].start).getTime() -
        new Date(slot.start).getTime(),
    ).toBe(15 * 60_000);

    try {
      await prisma.appointment.create({
        data: {
          confirmationCode: `CB-TEST-${randomUUID()}`,
          managementToken: createManagementToken(),
          barberId: barber.id,
          serviceId: service.id,
          customerName: "Availability Test",
          customerEmail: testEmail,
          customerPhone: "+1-212-555-0199",
          serviceName: service.name,
          serviceDurationMinutes: service.durationMinutes,
          serviceBufferMinutes: service.bufferMinutes,
          startsAt: new Date(slot.start),
          endsAt: new Date(slot.end),
          timeZone: SHOP_TIME_ZONE,
          status: AppointmentStatus.CONFIRMED,
          bookingSource: BookingSource.WEBSITE,
          priceCents: service.priceCents,
          depositCents: service.depositCents,
          currency: service.currency,
          paymentStatus: PaymentStatus.PENDING,
        },
      });

      const updatedAvailability = await getAvailability({
        serviceId: service.id,
        barberId: barber.id,
        date,
        now,
      });

      expect(
        updatedAvailability.slots.some(
          (candidate) => candidate.start === slot.start,
        ),
      ).toBe(false);
    } finally {
      await prisma.appointment.deleteMany({
        where: { customerEmail: testEmail },
      });
    }
  });
});

describe("concurrent booking submission", () => {
  it("commits exactly one request for the same barber and slot", async () => {
    const { service, barber } = await getSeedBookingData();
    const date = getFutureOpenDate(14);
    const testEmail = "phase3-concurrency-test@example.com";

    await prisma.appointment.deleteMany({ where: { customerEmail: testEmail } });

    try {
      const availability = await getAvailability({
        serviceId: service.id,
        barberId: barber.id,
        date,
      });
      const slot = availability.slots[0];

      expect(slot).toBeDefined();

      if (!slot) {
        throw new Error("Expected at least one slot for the concurrency test.");
      }

      const input = {
        serviceId: service.id,
        barberId: barber.id,
        date,
        startsAt: slot.start,
        customerName: "Concurrency Test",
        customerEmail: testEmail,
        customerPhone: "+1-212-555-0188",
        customerNotes: "Created by the Phase 3 concurrency test.",
      };
      const results = await Promise.allSettled([
        createAppointment(input),
        createAppointment(input),
      ]);
      const success = results.find((result) => result.status === "fulfilled");
      const rejection = results.find((result) => result.status === "rejected");
      const failureMessages = results
        .filter((result) => result.status === "rejected")
        .map((result) => String(result.reason))
        .join("\n");

      expect(
        results.map((result) => result.status).sort(),
        failureMessages,
      ).toEqual(["fulfilled", "rejected"]);
      expect(success?.status).toBe("fulfilled");
      expect(rejection?.status).toBe("rejected");

      if (success?.status !== "fulfilled" || rejection?.status !== "rejected") {
        throw new Error("Expected one successful and one rejected booking.");
      }

      expect(success.value.status).toBe(AppointmentStatus.PENDING_PAYMENT);
      expect(rejection.reason).toBeInstanceOf(BookingError);
      expect(rejection.reason).toMatchObject({
        code: "SLOT_UNAVAILABLE",
        status: 409,
      });
      expect(
        await prisma.appointment.count({
          where: {
            customerEmail: testEmail,
            barberId: barber.id,
            startsAt: new Date(slot.start),
          },
        }),
      ).toBe(1);
    } finally {
      await prisma.appointment.deleteMany({
        where: { customerEmail: testEmail },
      });
    }
  });
});
