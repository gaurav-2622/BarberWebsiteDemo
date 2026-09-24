import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import {
  AppointmentStatus,
  PaymentStatus,
  UserRole,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { processAppointmentReminders } from "./reminders";
import type { EmailMessage } from "./resend";
import { createManagementToken } from "@/lib/booking/tokens";

const testEmail = "phase6-reminder-test@example.com";

afterAll(async () => {
  await prisma.appointment.deleteMany({
    where: { customerEmail: testEmail },
  });
  await prisma.$disconnect();
});

describe("appointment reminder processing", () => {
  it("sends one 24-hour reminder and stays idempotent", async () => {
    const [service, barber] = await Promise.all([
      prisma.service.findUniqueOrThrow({
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
      prisma.user.findFirstOrThrow({
        where: {
          email: "owner@crownandblade.example",
          role: UserRole.OWNER,
        },
        select: { id: true },
      }),
    ]);
    const now = new Date("2026-09-25T12:00:00.000Z");
    const startsAt = new Date("2026-09-26T06:00:00.000Z");
    const messages: EmailMessage[] = [];
    const appointment = await prisma.appointment.create({
      data: {
        confirmationCode: `CB-P6R-${randomUUID().slice(0, 8).toUpperCase()}`,
        managementToken: createManagementToken(),
        barberId: barber.id,
        serviceId: service.id,
        customerName: "Phase Six Reminder",
        customerEmail: testEmail,
        customerPhone: "+1-212-555-0177",
        serviceName: service.name,
        serviceDurationMinutes: service.durationMinutes,
        serviceBufferMinutes: service.bufferMinutes,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 45 * 60_000),
        status: AppointmentStatus.CONFIRMED,
        priceCents: service.priceCents,
        depositCents: service.depositCents,
        amountPaidCents: service.depositCents,
        currency: service.currency,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    const first = await processAppointmentReminders({
      now,
      sender: async (message) => {
        messages.push(message);
      },
    });
    const second = await processAppointmentReminders({
      now,
      sender: async (message) => {
        messages.push(message);
      },
    });
    const saved = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
      select: { reminder24hSentAt: true },
    });

    expect(first.sent24h).toBe(1);
    expect(second.sent24h).toBe(0);
    expect(messages[0]?.to).toBe(testEmail);
    expect(messages[0]?.subject).toContain("tomorrow");
    expect(saved.reminder24hSentAt).toBeTruthy();
  });
});
