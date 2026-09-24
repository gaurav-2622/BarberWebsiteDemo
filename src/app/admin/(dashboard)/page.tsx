import {
  CalendarCheck2,
  CalendarRange,
  CircleDollarSign,
  WalletCards,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Overview",
};

import { AdminPageHeader, AdminPanel } from "@/components/admin/admin-ui";
import { AppointmentStatusBadge } from "@/components/admin/status-badge";
import {
  AppointmentStatus,
  PaymentStatus,
} from "@/generated/prisma/client";
import {
  ACTIVE_TODAY_STATUSES,
  OUTSTANDING_BALANCE_STATUSES,
  sumOutstandingBalance,
} from "@/lib/admin/metrics";
import {
  formatBookingDate,
  formatSlotTime,
  getShopDateKey,
  getShopDayBounds,
} from "@/lib/booking/time";
import { formatCurrency } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const today = getShopDateKey();
  const dayBounds = getShopDayBounds(today);
  const now = new Date();
  const [
    settings,
    todaysAppointments,
    totalBookings,
    paidRevenue,
    outstandingAppointments,
    upcomingAppointments,
  ] = await Promise.all([
    prisma.shopSettings.findUniqueOrThrow({
      where: { id: "default" },
      select: { currency: true },
    }),
    prisma.appointment.count({
      where: {
        startsAt: {
          gte: dayBounds.startsAt,
          lt: dayBounds.endsAt,
        },
        status: {
          in: [...ACTIVE_TODAY_STATUSES],
        },
      },
    }),
    prisma.appointment.count(),
    prisma.appointment.aggregate({
      where: { paymentStatus: PaymentStatus.PAID },
      _sum: { amountPaidCents: true },
    }),
    prisma.appointment.findMany({
      where: {
        status: {
          in: [...OUTSTANDING_BALANCE_STATUSES],
        },
      },
      select: {
        priceCents: true,
        amountPaidCents: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: now },
        status: {
          in: [
            AppointmentStatus.PENDING,
            AppointmentStatus.PENDING_PAYMENT,
            AppointmentStatus.CONFIRMED,
          ],
        },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
      select: {
        id: true,
        confirmationCode: true,
        customerName: true,
        serviceName: true,
        startsAt: true,
        status: true,
        barber: {
          select: { name: true },
        },
      },
    }),
  ]);
  const outstandingBalance = sumOutstandingBalance(outstandingAppointments);

  return (
    <>
      <AdminPageHeader
        eyebrow="Command center"
        title="Overview"
        description={`Live shop performance and upcoming chairs for ${formatBookingDate(dayBounds.startsAt)}.`}
        action={
          <Link
            href="/admin/appointments"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#111] px-5 text-[10px] font-bold tracking-[0.12em] text-white uppercase"
          >
            Manage appointments
          </Link>
        }
      />

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Today’s appointments"
          value={todaysAppointments.toLocaleString("en-US")}
          icon={<CalendarCheck2 className="size-5" />}
          detail="Eastern Time"
        />
        <MetricCard
          label="Total bookings"
          value={totalBookings.toLocaleString("en-US")}
          icon={<CalendarRange className="size-5" />}
          detail="All recorded appointments"
        />
        <MetricCard
          label="Revenue"
          value={formatCurrency(
            paidRevenue._sum.amountPaidCents ?? 0,
            settings.currency,
          )}
          icon={<CircleDollarSign className="size-5" />}
          detail="Successfully completed payments"
        />
        <MetricCard
          label="Outstanding balances"
          value={formatCurrency(outstandingBalance, settings.currency)}
          icon={<WalletCards className="size-5" />}
          detail="Confirmed and completed bookings"
        />
      </section>

      <AdminPanel
        title="Upcoming appointments"
        eyebrow="Next in the chairs"
        className="mt-7"
        action={
          <Link
            href="/admin/appointments"
            className="text-[9px] font-bold tracking-[0.12em] text-[#8b672e] uppercase"
          >
            View all →
          </Link>
        }
      >
        {upcomingAppointments.length > 0 ? (
          <div className="divide-y divide-black/8">
            {upcomingAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="grid gap-3 px-5 py-5 sm:grid-cols-[1.1fr_1fr_auto] sm:items-center sm:px-6"
              >
                <div>
                  <p className="font-semibold">{appointment.customerName}</p>
                  <p className="mt-1 text-xs text-black/45">
                    {appointment.serviceName} ·{" "}
                    {appointment.barber.name ?? "Unassigned barber"}
                  </p>
                </div>
                <div className="text-xs">
                  <p className="font-medium">
                    {formatBookingDate(appointment.startsAt)}
                  </p>
                  <p className="mt-1 text-black/45">
                    {formatSlotTime(appointment.startsAt)} ·{" "}
                    {appointment.confirmationCode}
                  </p>
                </div>
                <AppointmentStatusBadge status={appointment.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="px-6 py-12 text-center text-sm text-black/45">
            No upcoming appointments.
          </p>
        )}
      </AdminPanel>
    </>
  );
}

function MetricCard({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  detail: string;
}) {
  return (
    <article className="border border-black/12 bg-[#f8f5ed] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-5">
        <p className="text-[9px] font-bold tracking-[0.14em] text-black/48 uppercase">
          {label}
        </p>
        <span className="text-[#9a7437]">{icon}</span>
      </div>
      <p className="font-display mt-7 text-3xl tracking-[-0.03em] sm:text-4xl">
        {value}
      </p>
      <p className="mt-2 text-[10px] text-black/40">{detail}</p>
    </article>
  );
}
