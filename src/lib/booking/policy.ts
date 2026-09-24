import { AppointmentStatus } from "@/generated/prisma/client";

export const CUSTOMER_MANAGEABLE_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
] as const;

export function canCustomerChangeAppointment(
  startsAt: Date,
  cancellationWindowHours: number,
  now = new Date(),
) {
  const deadline = new Date(
    startsAt.getTime() - cancellationWindowHours * 60 * 60 * 1000,
  );

  return now.getTime() <= deadline.getTime();
}

export function isCustomerManageableStatus(status: AppointmentStatus) {
  return CUSTOMER_MANAGEABLE_STATUSES.includes(
    status as (typeof CUSTOMER_MANAGEABLE_STATUSES)[number],
  );
}

export function getChangeDeadline(
  startsAt: Date,
  cancellationWindowHours: number,
) {
  return new Date(
    startsAt.getTime() - cancellationWindowHours * 60 * 60 * 1000,
  );
}
