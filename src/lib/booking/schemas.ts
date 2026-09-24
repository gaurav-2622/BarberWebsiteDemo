import { z } from "zod";

import { isValidDateKey } from "./time";

const dateKeySchema = z
  .string()
  .trim()
  .refine(isValidDateKey, "Use a valid date in YYYY-MM-DD format.");

const barberPreferenceSchema = z.union([
  z.literal("any"),
  z.string().uuid("Choose a valid barber."),
]);

export const availabilityQuerySchema = z.object({
  serviceId: z.string().uuid("Choose a valid service."),
  barberId: barberPreferenceSchema.default("any"),
  date: dateKeySchema,
});

export const createAppointmentSchema = z.object({
  serviceId: z.string().uuid("Choose a valid service."),
  barberId: barberPreferenceSchema,
  date: dateKeySchema,
  startsAt: z
    .string()
    .datetime({ offset: true, message: "Choose a valid appointment time." }),
  customerName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Name must be 80 characters or fewer."),
  customerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(254),
  customerPhone: z
    .string()
    .trim()
    .min(10, "Enter a valid phone number.")
    .max(25, "Phone number must be 25 characters or fewer.")
    .refine(
      (phone) => {
        const digitCount = phone.replace(/\D/g, "").length;
        return digitCount >= 10 && digitCount <= 15;
      },
      "Enter a phone number with 10 to 15 digits.",
    ),
  customerNotes: z
    .string()
    .trim()
    .max(500, "Notes must be 500 characters or fewer.")
    .optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
