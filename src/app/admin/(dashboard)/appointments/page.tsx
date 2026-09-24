import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Appointments",
};

import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-ui";
import {
  AppointmentStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/status-badge";
import { AppointmentStatus } from "@/generated/prisma/client";
import { updateAppointmentAction } from "@/lib/admin/appointment-actions";
import {
  formatBookingDate,
  formatSlotTime,
} from "@/lib/booking/time";
import { formatCurrency } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

const pageSize = 10;

type AppointmentsPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    status?: string | string[];
  }>;
};

export default async function AdminAppointmentsPage({
  searchParams,
}: AppointmentsPageProps) {
  const query = await searchParams;
  const requestedPage = Number(Array.isArray(query.page) ? query.page[0] : query.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedStatus = Array.isArray(query.status)
    ? query.status[0]
    : query.status;
  const status = Object.values(AppointmentStatus).find(
    (candidate) => candidate === requestedStatus,
  );
  const where = status ? { status } : {};
  const [settings, appointmentCount, appointments] = await Promise.all([
    prisma.shopSettings.findUniqueOrThrow({
      where: { id: "default" },
      select: { currency: true },
    }),
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        confirmationCode: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        serviceName: true,
        startsAt: true,
        status: true,
        paymentStatus: true,
        priceCents: true,
        amountPaidCents: true,
        barber: {
          select: { name: true },
        },
      },
    }),
  ]);
  const totalPages = Math.max(Math.ceil(appointmentCount / pageSize), 1);

  return (
    <>
      <AdminPageHeader
        eyebrow="Schedule control"
        title="Appointments"
        description="Review every booking, payment state, and chair assignment."
      />

      <AdminPanel
        title={`${appointmentCount.toLocaleString("en-US")} appointments`}
        className="mt-7"
        action={
          <form className="flex items-center gap-2" method="get">
            <Filter className="size-3.5 text-[#8b672e]" />
            <select
              name="status"
              defaultValue={status ?? ""}
              aria-label="Filter appointments by status"
              className="h-9 border border-black/15 bg-white px-3 text-[10px] font-semibold uppercase outline-none focus:border-[#9a7437]"
            >
              <option value="">All statuses</option>
              {Object.values(AppointmentStatus).map((option) => (
                <option key={option} value={option}>
                  {option.toLowerCase().replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-full bg-[#111] px-4 text-[9px] font-bold tracking-[0.1em] text-white uppercase"
            >
              Apply
            </button>
          </form>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead>
              <tr className="border-b border-black/10 bg-[#eee9de] text-[8px] font-bold tracking-[0.14em] text-black/48 uppercase">
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Appointment</th>
                <th className="px-4 py-3.5">Barber</th>
                <th className="px-4 py-3.5">Booking status</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-4 py-3.5">Balance</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/8">
              {appointments.map((appointment) => {
                const balanceCents = Math.max(
                  appointment.priceCents - appointment.amountPaidCents,
                  0,
                );

                return (
                  <tr key={appointment.id} className="align-top text-xs">
                    <td className="px-5 py-5">
                      <p className="font-semibold">{appointment.customerName}</p>
                      <p className="mt-1 text-[10px] text-black/45">
                        {appointment.customerEmail}
                      </p>
                      <p className="mt-0.5 text-[10px] text-black/45">
                        {appointment.customerPhone}
                      </p>
                    </td>
                    <td className="px-4 py-5">
                      <p className="font-medium">{appointment.serviceName}</p>
                      <p className="mt-1 text-[10px] text-black/45">
                        {formatBookingDate(appointment.startsAt)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-black/45">
                        {formatSlotTime(appointment.startsAt)} ·{" "}
                        {appointment.confirmationCode}
                      </p>
                    </td>
                    <td className="px-4 py-5">
                      {appointment.barber.name ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-5">
                      <AppointmentStatusBadge status={appointment.status} />
                    </td>
                    <td className="px-4 py-5">
                      <PaymentStatusBadge status={appointment.paymentStatus} />
                      <p className="mt-2 text-[10px] text-black/45">
                        {formatCurrency(
                          appointment.amountPaidCents,
                          settings.currency,
                        )}{" "}
                        paid
                      </p>
                    </td>
                    <td className="px-4 py-5 font-semibold">
                      {formatCurrency(balanceCents, settings.currency)}
                    </td>
                    <td className="px-5 py-5">
                      <form
                        action={updateAppointmentAction}
                        className="flex flex-wrap justify-end gap-1.5"
                      >
                        <input
                          type="hidden"
                          name="appointmentId"
                          value={appointment.id}
                        />
                        {appointment.status !== AppointmentStatus.CONFIRMED &&
                        appointment.status !== AppointmentStatus.COMPLETED ? (
                          <ActionButton value="confirm">Confirm</ActionButton>
                        ) : null}
                        {appointment.status !== AppointmentStatus.COMPLETED ? (
                          <ActionButton value="complete">Complete</ActionButton>
                        ) : null}
                        {balanceCents > 0 ? (
                          <ActionButton value="paid_in_person">
                            Paid in person
                          </ActionButton>
                        ) : null}
                        {appointment.status !== AppointmentStatus.CANCELLED ? (
                          <ActionButton value="cancel" danger>
                            Cancel
                          </ActionButton>
                        ) : null}
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {appointments.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-black/45">
            No appointments match this filter.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4 border-t border-black/10 px-5 py-4 text-xs sm:px-6">
          <p className="text-black/45">
            Page {Math.min(page, totalPages)} of {totalPages}
          </p>
          <div className="flex gap-2">
            <PaginationLink
              page={page - 1}
              status={status}
              disabled={page <= 1}
              label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </PaginationLink>
            <PaginationLink
              page={page + 1}
              status={status}
              disabled={page >= totalPages}
              label="Next page"
            >
              <ChevronRight className="size-4" />
            </PaginationLink>
          </div>
        </div>
      </AdminPanel>
    </>
  );
}

function ActionButton({
  value,
  danger = false,
  children,
}: {
  value: "cancel" | "complete" | "confirm" | "paid_in_person";
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      name="action"
      value={value}
      className={`min-h-8 border px-2.5 text-[8px] font-bold tracking-[0.08em] uppercase transition-colors ${
        danger
          ? "border-red-900/20 text-red-800 hover:bg-red-50"
          : "border-black/15 text-black/60 hover:border-black/35 hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}

function PaginationLink({
  page,
  status,
  disabled,
  label,
  children,
}: {
  page: number;
  status?: AppointmentStatus;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const parameters = new URLSearchParams({ page: String(page) });

  if (status) {
    parameters.set("status", status);
  }

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="flex size-9 items-center justify-center border border-black/8 text-black/20"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={`/admin/appointments?${parameters}`}
      aria-label={label}
      className="flex size-9 items-center justify-center border border-black/15 text-black/55 transition-colors hover:border-black/35 hover:text-black"
    >
      {children}
    </Link>
  );
}
