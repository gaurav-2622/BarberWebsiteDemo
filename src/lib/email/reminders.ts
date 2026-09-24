import { timingSafeEqual } from "node:crypto";

import { AppointmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { notifyAppointment } from "./notify";
import type { EmailSender } from "./resend";

const REMINDABLE_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
] as const;

export const DEFAULT_FIRST_REMINDER_HOURS = 24;
export const DEFAULT_SECOND_REMINDER_HOURS = 2;

export function isAuthorizedCronRequest(
  providedSecret: string | null,
  expectedSecret = process.env.CRON_SECRET,
) {
  const expected = expectedSecret?.trim();

  if (!expected || expected.includes("replace")) {
    return false;
  }

  const received = providedSecret?.trim() ?? "";

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export function getReminderWindows(now = new Date()) {
  return {
    now,
    firstReminderEndsAt: new Date(
      now.getTime() + DEFAULT_FIRST_REMINDER_HOURS * 60 * 60 * 1000,
    ),
    secondReminderEndsAt: new Date(
      now.getTime() + DEFAULT_SECOND_REMINDER_HOURS * 60 * 60 * 1000,
    ),
  };
}

export async function processAppointmentReminders({
  now = new Date(),
  sender,
}: {
  now?: Date;
  sender?: EmailSender;
} = {}) {
  const settings = await prisma.shopSettings.findUnique({
    where: { id: "default" },
    select: { reminderEmailEnabled: true, reminderLeadHours: true },
  });

  if (!settings?.reminderEmailEnabled) {
    return { sent24h: 0, sent2h: 0, skipped: true as const };
  }

  const firstReminderHours =
    settings.reminderLeadHours > 0
      ? settings.reminderLeadHours
      : DEFAULT_FIRST_REMINDER_HOURS;
  const firstReminderEndsAt = new Date(
    now.getTime() + firstReminderHours * 60 * 60 * 1000,
  );
  const secondReminderEndsAt = new Date(
    now.getTime() + DEFAULT_SECOND_REMINDER_HOURS * 60 * 60 * 1000,
  );
  const [firstReminders, secondReminders] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: { in: [...REMINDABLE_STATUSES] },
        reminder24hSentAt: null,
        startsAt: {
          gt: secondReminderEndsAt,
          lte: firstReminderEndsAt,
        },
      },
      select: { id: true },
    }),
    prisma.appointment.findMany({
      where: {
        status: { in: [...REMINDABLE_STATUSES] },
        reminder2hSentAt: null,
        startsAt: {
          gt: now,
          lte: secondReminderEndsAt,
        },
      },
      select: { id: true },
    }),
  ]);

  let sent24h = 0;
  let sent2h = 0;

  for (const appointment of firstReminders) {
    const result = await notifyAppointment("reminder_24h", appointment.id, {
      sender,
    });

    if (result.delivered) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          reminder24hSentAt: now,
          reminderSentAt: now,
        },
      });
      sent24h += 1;
    }
  }

  for (const appointment of secondReminders) {
    const result = await notifyAppointment("reminder_2h", appointment.id, {
      sender,
    });

    if (result.delivered) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          reminder2hSentAt: now,
          reminderSentAt: now,
        },
      });
      sent2h += 1;
    }
  }

  return { sent24h, sent2h, skipped: false as const };
}
