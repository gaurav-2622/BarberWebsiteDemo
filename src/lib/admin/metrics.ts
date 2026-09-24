import {
  AppointmentStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

export const ACTIVE_TODAY_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.PENDING_PAYMENT,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
] as const;

export const OUTSTANDING_BALANCE_STATUSES = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
] as const;

export function sumOutstandingBalance(
  appointments: Array<{ priceCents: number; amountPaidCents: number }>,
) {
  return appointments.reduce(
    (total, appointment) =>
      total + Math.max(appointment.priceCents - appointment.amountPaidCents, 0),
    0,
  );
}

export function isCompletedPayment(status: PaymentStatus) {
  return status === PaymentStatus.PAID;
}
