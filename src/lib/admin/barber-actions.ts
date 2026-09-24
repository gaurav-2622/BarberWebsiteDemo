"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { UserRole } from "@/generated/prisma/client";
import { requireOwner } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

const optionalEmailSchema = z.union([
  z.literal(""),
  z.string().trim().toLowerCase().email(),
]);
const optionalImageSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || value.startsWith("/"),
    "Use a local image path beginning with /.",
  );
const barberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: optionalEmailSchema,
  phone: z.string().trim().max(25),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  jobTitle: z.string().trim().max(100),
  bio: z.string().trim().max(1_000),
  image: optionalImageSchema,
});
const barberIdSchema = z.string().uuid();

function parseBarberForm(formData: FormData) {
  const barber = barberSchema.parse({
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    slug: formData.get("slug"),
    jobTitle: formData.get("jobTitle") ?? "",
    bio: formData.get("bio") ?? "",
    image: formData.get("image") ?? "",
  });
  const phoneDigits = barber.phone.replace(/\D/g, "").length;

  if (barber.phone && (phoneDigits < 10 || phoneDigits > 15)) {
    throw new Error("Phone numbers must contain 10 to 15 digits.");
  }

  return barber;
}

export async function createBarberAction(formData: FormData) {
  await requireOwner();
  const barber = parseBarberForm(formData);

  const createdBarber = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: barber.name,
        email: barber.email || null,
        phone: barber.phone || null,
        slug: barber.slug,
        jobTitle: barber.jobTitle || "Barber",
        bio: barber.bio || null,
        image: barber.image || null,
        role: UserRole.BARBER,
        isActive: true,
      },
      select: { id: true },
    });
    const activeServices = await tx.service.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    if (activeServices.length > 0) {
      await tx.barberService.createMany({
        data: activeServices.map((service) => ({
          barberId: user.id,
          serviceId: service.id,
          isActive: true,
        })),
      });
    }

    await tx.workingHour.createMany({
      data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        barberId: user.id,
        dayOfWeek,
        startMinute: 9 * 60,
        endMinute: 18 * 60,
        isActive: dayOfWeek !== 0,
      })),
    });

    return user;
  });

  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/admin/barbers");
  redirect(`/admin/barbers/${createdBarber.id}?notice=created`);
}

export async function updateBarberAction(formData: FormData) {
  await requireOwner();
  const barberId = barberIdSchema.parse(formData.get("barberId"));
  const barber = parseBarberForm(formData);
  const isActive = formData.get("isActive") === "on";
  const existingBarber = await prisma.user.findFirstOrThrow({
    where: {
      id: barberId,
      role: { in: [UserRole.OWNER, UserRole.BARBER] },
    },
    select: {
      role: true,
      email: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: barberId },
      data: {
        name: barber.name,
        email:
          existingBarber.role === UserRole.OWNER
            ? existingBarber.email
            : barber.email || null,
        phone: barber.phone || null,
        slug: barber.slug,
        jobTitle: barber.jobTitle || "Barber",
        bio: barber.bio || null,
        image: barber.image || null,
        isActive:
          existingBarber.role === UserRole.OWNER ? true : isActive,
      },
    });

    if (existingBarber.role === UserRole.BARBER) {
      await tx.barberService.updateMany({
        where: { barberId },
        data: { isActive },
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/admin/barbers");
  redirect(`/admin/barbers/${barberId}?notice=saved`);
}

export async function updateBarberScheduleAction(formData: FormData) {
  await requireOwner();
  const barberId = barberIdSchema.parse(formData.get("barberId"));

  await prisma.user.findFirstOrThrow({
    where: {
      id: barberId,
      role: { in: [UserRole.OWNER, UserRole.BARBER] },
    },
    select: { id: true },
  });

  const schedules = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const startMinute = parseTimeValue(
      formData.get(`day-${dayOfWeek}-start`),
    );
    const endMinute = parseTimeValue(formData.get(`day-${dayOfWeek}-end`));

    if (endMinute <= startMinute) {
      throw new Error("Working hours must end after they start.");
    }

    return {
      dayOfWeek,
      startMinute,
      endMinute,
      isActive: formData.get(`day-${dayOfWeek}-active`) === "on",
    };
  });

  await prisma.$transaction(
    schedules.map((schedule) =>
      prisma.workingHour.upsert({
        where: {
          barberId_dayOfWeek: {
            barberId,
            dayOfWeek: schedule.dayOfWeek,
          },
        },
        update: schedule,
        create: {
          barberId,
          ...schedule,
        },
      }),
    ),
  );

  revalidatePath("/book");
  revalidatePath(`/admin/barbers/${barberId}`);
  redirect(`/admin/barbers/${barberId}?notice=schedule-saved`);
}

export async function deleteBarberAction(formData: FormData) {
  await requireOwner();
  const barberId = barberIdSchema.parse(formData.get("barberId"));
  const barber = await prisma.user.findFirstOrThrow({
    where: {
      id: barberId,
      role: { in: [UserRole.OWNER, UserRole.BARBER] },
    },
    select: { role: true },
  });

  if (barber.role === UserRole.OWNER) {
    throw new Error("Owner accounts cannot be deleted from barber management.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const appointmentCount = await tx.appointment.count({
      where: { barberId },
    });

    if (appointmentCount > 0) {
      await tx.user.update({
        where: { id: barberId },
        data: { isActive: false },
      });
      await tx.barberService.updateMany({
        where: { barberId },
        data: { isActive: false },
      });

      return "archived";
    }

    await tx.user.delete({
      where: { id: barberId },
    });

    return "deleted";
  });

  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/admin/barbers");
  redirect(`/admin/barbers?notice=${result}`);
}

function parseTimeValue(value: FormDataEntryValue | null) {
  const parsed = z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .parse(value);
  const [hour, minute] = parsed.split(":").map(Number);

  return hour * 60 + minute;
}
