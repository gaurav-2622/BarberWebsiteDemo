import {
  AppointmentStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

export const appointmentOwnerActions = [
  "cancel",
  "complete",
  "confirm",
  "paid_in_person",
] as const;

export type AppointmentOwnerAction = (typeof appointmentOwnerActions)[number];

type AppointmentSnapshot = {
  status: AppointmentStatus;
  priceCents: number;
  internalNotes: string | null;
};

export function getAppointmentUpdate(
  appointment: AppointmentSnapshot,
  action: AppointmentOwnerAction,
  now = new Date(),
) {
  switch (action) {
    case "confirm":
      return {
        status: AppointmentStatus.CONFIRMED,
        cancellationReason: null,
        cancelledAt: null,
      };
    case "complete":
      return {
        status: AppointmentStatus.COMPLETED,
      };
    case "cancel":
      return {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: "Cancelled by owner.",
        cancelledAt: now,
      };
    case "paid_in_person": {
      const paymentNote = "Paid in person and recorded by owner.";

      return {
        status:
          appointment.status === AppointmentStatus.COMPLETED
            ? AppointmentStatus.COMPLETED
            : AppointmentStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        amountPaidCents: appointment.priceCents,
        internalNotes: appointment.internalNotes
          ? `${appointment.internalNotes}\n${paymentNote}`
          : paymentNote,
        cancellationReason: null,
        cancelledAt: null,
      };
    }
  }
}
