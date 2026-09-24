"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  appointmentOwnerActions,
  getAppointmentUpdate,
} from "@/lib/admin/appointment-updates";
import { requireOwner } from "@/lib/admin/auth";
import { notifyAppointment } from "@/lib/email/notify";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  appointmentId: z.string().uuid(),
  action: z.enum(appointmentOwnerActions),
});

export async function updateAppointmentAction(formData: FormData) {
  await requireOwner();
  const input = updateSchema.parse({
    appointmentId: formData.get("appointmentId"),
    action: formData.get("action"),
  });
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: input.appointmentId },
    select: {
      status: true,
      priceCents: true,
      internalNotes: true,
    },
  });

  await prisma.appointment.update({
    where: { id: input.appointmentId },
    data: getAppointmentUpdate(appointment, input.action),
  });

  if (input.action === "cancel") {
    void notifyAppointment("cancelled", input.appointmentId);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/appointments");
}
