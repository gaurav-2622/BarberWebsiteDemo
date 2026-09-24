"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireOwner } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(10).max(25),
  addressLine1: z.string().trim().min(3).max(160),
  addressLine2: z.string().trim().max(160),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(50),
  postalCode: z.string().trim().min(5).max(12),
  bookingWindowDays: z.coerce.number().int().min(1).max(365),
  minimumLeadTimeMinutes: z.coerce.number().int().min(0).max(10_080),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(120),
  cancellationWindowHours: z.coerce.number().int().min(0).max(168),
});

export async function updateSettingsAction(formData: FormData) {
  await requireOwner();
  const settings = settingsSchema.parse({
    businessName: formData.get("businessName"),
    tagline: formData.get("tagline") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") ?? "",
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    bookingWindowDays: formData.get("bookingWindowDays"),
    minimumLeadTimeMinutes: formData.get("minimumLeadTimeMinutes"),
    slotIntervalMinutes: formData.get("slotIntervalMinutes"),
    cancellationWindowHours: formData.get("cancellationWindowHours"),
  });
  const phoneDigits = settings.phone.replace(/\D/g, "").length;

  if (phoneDigits < 10 || phoneDigits > 15) {
    throw new Error("Phone numbers must contain 10 to 15 digits.");
  }

  await prisma.shopSettings.update({
    where: { id: "default" },
    data: {
      ...settings,
      tagline: settings.tagline || null,
      addressLine2: settings.addressLine2 || null,
      bookingEnabled: formData.get("bookingEnabled") === "on",
      onlinePaymentsEnabled:
        formData.get("onlinePaymentsEnabled") === "on",
    },
  });

  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?notice=saved");
}
