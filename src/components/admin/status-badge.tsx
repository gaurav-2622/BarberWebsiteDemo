import {
  AppointmentStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

const appointmentStyles: Record<AppointmentStatus, string> = {
  PENDING: "border-amber-800/20 bg-amber-100 text-amber-900",
  PENDING_PAYMENT: "border-amber-800/20 bg-amber-100 text-amber-900",
  CONFIRMED: "border-emerald-800/20 bg-emerald-100 text-emerald-900",
  COMPLETED: "border-slate-800/15 bg-slate-200 text-slate-800",
  CANCELLED: "border-red-800/15 bg-red-100 text-red-900",
  NO_SHOW: "border-red-800/15 bg-red-100 text-red-900",
};

const paymentStyles: Record<PaymentStatus, string> = {
  NOT_REQUIRED: "border-slate-800/15 bg-slate-100 text-slate-700",
  PENDING: "border-amber-800/20 bg-amber-100 text-amber-900",
  PAID: "border-emerald-800/20 bg-emerald-100 text-emerald-900",
  PARTIALLY_REFUNDED: "border-violet-800/15 bg-violet-100 text-violet-900",
  REFUNDED: "border-violet-800/15 bg-violet-100 text-violet-900",
  FAILED: "border-red-800/15 bg-red-100 text-red-900",
};

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

export function AppointmentStatusBadge({
  status,
}: {
  status: AppointmentStatus;
}) {
  return (
    <span
      className={`inline-flex border px-2 py-1 text-[8px] font-bold tracking-[0.1em] uppercase ${appointmentStyles[status]}`}
    >
      {humanize(status)}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  return (
    <span
      className={`inline-flex border px-2 py-1 text-[8px] font-bold tracking-[0.1em] uppercase ${paymentStyles[status]}`}
    >
      {humanize(status)}
    </span>
  );
}
