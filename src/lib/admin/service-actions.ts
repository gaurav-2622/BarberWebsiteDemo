"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { UserRole } from "@/generated/prisma/client";
import { requireOwner } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

const moneySchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, "Use a valid dollar amount.")
  .transform((value) => Math.round(Number(value) * 100));

const serviceSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    category: z.string().trim().max(60),
    description: z.string().trim().max(500),
    durationMinutes: z.coerce.number().int().min(5).max(480),
    bufferMinutes: z.coerce.number().int().min(0).max(120),
    priceCents: moneySchema,
    depositCents: moneySchema,
  })
  .refine((service) => service.depositCents <= service.priceCents, {
    path: ["depositCents"],
    message: "The deposit cannot exceed the service price.",
  });

const serviceIdSchema = z.string().uuid();

function parseServiceForm(formData: FormData) {
  return serviceSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    category: formData.get("category") ?? "",
    description: formData.get("description") ?? "",
    durationMinutes: formData.get("durationMinutes"),
    bufferMinutes: formData.get("bufferMinutes"),
    priceCents: formData.get("price"),
    depositCents: formData.get("deposit"),
  });
}

export async function createServiceAction(formData: FormData) {
  await requireOwner();
  const service = parseServiceForm(formData);

  await prisma.$transaction(async (tx) => {
    const createdService = await tx.service.create({
      data: {
        ...service,
        category: service.category || null,
        description: service.description || null,
        currency: "USD",
        isActive: true,
      },
      select: { id: true },
    });
    const activeBarbers = await tx.user.findMany({
      where: {
        isActive: true,
        role: { in: [UserRole.OWNER, UserRole.BARBER] },
      },
      select: { id: true },
    });

    if (activeBarbers.length > 0) {
      await tx.barberService.createMany({
        data: activeBarbers.map((barber) => ({
          barberId: barber.id,
          serviceId: createdService.id,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/admin/services");
  redirect("/admin/services?notice=created");
}

export async function updateServiceAction(formData: FormData) {
  await requireOwner();
  const serviceId = serviceIdSchema.parse(formData.get("serviceId"));
  const service = parseServiceForm(formData);
  const isActive = formData.get("isActive") === "on";

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      ...service,
      category: service.category || null,
      description: service.description || null,
      isActive,
    },
  });

  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/admin/services");
  redirect(`/admin/services/${serviceId}?notice=saved`);
}

export async function deleteServiceAction(formData: FormData) {
  await requireOwner();
  const serviceId = serviceIdSchema.parse(formData.get("serviceId"));
  const result = await prisma.$transaction(async (tx) => {
    const appointmentCount = await tx.appointment.count({
      where: { serviceId },
    });

    if (appointmentCount > 0) {
      await tx.service.update({
        where: { id: serviceId },
        data: { isActive: false },
      });

      return "archived";
    }

    await tx.service.delete({
      where: { id: serviceId },
    });

    return "deleted";
  });

  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/admin/services");
  redirect(`/admin/services?notice=${result}`);
}
