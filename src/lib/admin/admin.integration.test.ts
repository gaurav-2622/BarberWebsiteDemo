import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import {
  AppointmentStatus,
  PaymentStatus,
  UserRole,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { createManagementToken } from "@/lib/booking/tokens";

import { authorizeOwnerCredentials } from "./authorize";
import { ensureAdminAccount } from "./ensure-admin";
import { getAppointmentUpdate } from "./appointment-updates";

const adminEmail = `phase5-admin-${randomUUID()}@example.com`;
const serviceSlug = `phase5-service-${randomUUID().slice(0, 8)}`;
const barberEmail = `phase5-barber-${randomUUID()}@example.com`;

afterAll(async () => {
  await prisma.appointment.deleteMany({
    where: { customerEmail: "phase5-admin-test@example.com" },
  });
  await prisma.service.deleteMany({ where: { slug: serviceSlug } });
  await prisma.user.deleteMany({
    where: { email: { in: [adminEmail, barberEmail] } },
  });
  await prisma.$disconnect();
});

describe("admin account seeding", () => {
  it("stores a bcrypt hash instead of the plaintext password", async () => {
    const password = "Phase5-Admin-Pass!";
    const admin = await ensureAdminAccount(prisma, {
      ADMIN_EMAIL: adminEmail,
      ADMIN_PASSWORD: password,
    });

    expect(admin.role).toBe(UserRole.OWNER);
    expect(admin.passwordHash).toBeTruthy();
    expect(admin.passwordHash).not.toContain(password);

    await expect(
      authorizeOwnerCredentials({
        email: adminEmail,
        password,
      }),
    ).resolves.toMatchObject({
      email: adminEmail,
      role: UserRole.OWNER,
    });
  });
});

describe("admin service and barber management", () => {
  it("creates, updates, and archives a service that already has appointments", async () => {
    const service = await prisma.service.create({
      data: {
        name: "Phase 5 Test Cut",
        slug: serviceSlug,
        category: "Haircuts",
        description: "Temporary service used by Phase 5 tests.",
        durationMinutes: 30,
        bufferMinutes: 5,
        priceCents: 3200,
        depositCents: 500,
        currency: "USD",
        isActive: true,
      },
    });
    const barber = await prisma.user.findFirstOrThrow({
      where: {
        email: "owner@crownandblade.example",
        role: UserRole.OWNER,
      },
      select: { id: true },
    });

    await prisma.appointment.create({
      data: {
        confirmationCode: `CB-P5-${randomUUID().slice(0, 8).toUpperCase()}`,
        managementToken: createManagementToken(),
        barberId: barber.id,
        serviceId: service.id,
        customerName: "Phase Five Admin Test",
        customerEmail: "phase5-admin-test@example.com",
        customerPhone: "+1-212-555-0133",
        serviceName: service.name,
        serviceDurationMinutes: service.durationMinutes,
        serviceBufferMinutes: service.bufferMinutes,
        startsAt: new Date("2026-10-20T15:00:00.000Z"),
        endsAt: new Date("2026-10-20T15:35:00.000Z"),
        status: AppointmentStatus.CONFIRMED,
        priceCents: service.priceCents,
        depositCents: service.depositCents,
        amountPaidCents: 0,
        currency: "USD",
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    await prisma.service.update({
      where: { id: service.id },
      data: {
        name: "Phase 5 Executive Cut",
        priceCents: 3800,
      },
    });

    const appointmentCount = await prisma.appointment.count({
      where: { serviceId: service.id },
    });

    expect(appointmentCount).toBe(1);

    await prisma.service.update({
      where: { id: service.id },
      data: { isActive: false },
    });

    const archived = await prisma.service.findUniqueOrThrow({
      where: { id: service.id },
      select: { name: true, isActive: true, priceCents: true },
    });

    expect(archived).toEqual({
      name: "Phase 5 Executive Cut",
      isActive: false,
      priceCents: 3800,
    });
  });

  it("creates a barber with default weekday hours", async () => {
    const barber = await prisma.user.create({
      data: {
        name: "Phase Five Barber",
        email: barberEmail,
        slug: `phase5-barber-${randomUUID().slice(0, 8)}`,
        jobTitle: "Barber",
        role: UserRole.BARBER,
        isActive: true,
        workingHours: {
          create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            dayOfWeek,
            startMinute: 9 * 60,
            endMinute: 18 * 60,
            isActive: dayOfWeek !== 0,
          })),
        },
      },
      include: {
        workingHours: {
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });

    expect(barber.workingHours).toHaveLength(7);
    expect(barber.workingHours[0]?.isActive).toBe(false);
    expect(barber.workingHours[1]?.isActive).toBe(true);
  });
});

describe("admin appointment persistence", () => {
  it("applies a paid-in-person update to a seeded appointment shape", () => {
    const update = getAppointmentUpdate(
      {
        status: AppointmentStatus.CONFIRMED,
        priceCents: 4500,
        internalNotes: null,
      },
      "paid_in_person",
    );

    expect(update).toMatchObject({
      status: AppointmentStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      amountPaidCents: 4500,
    });
  });
});
