import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ManageAppointment } from "@/components/booking/manage-appointment";
import {
  canCustomerChangeAppointment,
  isCustomerManageableStatus,
} from "@/lib/booking/policy";
import {
  getAppointmentByManagementToken,
  getManagePolicy,
} from "@/lib/booking/manage-appointment";
import {
  formatBookingDate,
  formatSlotTime,
  getLastBookableDateKey,
  getShopDateKey,
} from "@/lib/booking/time";
import { formatCurrency } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage your appointment",
  description: "View, reschedule, or cancel your Crown & Blade appointment.",
  robots: {
    index: false,
    follow: false,
  },
};

type ManagePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    notice?: string | string[];
  }>;
};

export default async function ManageBookingPage({
  params,
  searchParams,
}: ManagePageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const [appointment, settings] = await Promise.all([
    getAppointmentByManagementToken(token),
    getManagePolicy(),
  ]);

  if (!appointment) {
    notFound();
  }

  const notice = Array.isArray(query.notice) ? query.notice[0] : query.notice;
  const canChange =
    isCustomerManageableStatus(appointment.status) &&
    canCustomerChangeAppointment(
      appointment.startsAt,
      settings.cancellationWindowHours,
    );
  const balanceCents = Math.max(
    appointment.priceCents - appointment.amountPaidCents,
    0,
  );

  return (
    <main id="main-content" className="min-h-screen bg-[#0b0b0b]">
      <section className="border-b border-white/10 bg-[#101010]">
        <div className="site-container py-12 sm:py-16">
          <p className="eyebrow">Customer booking</p>
          <h1 className="font-display mt-5 max-w-4xl text-[clamp(2.6rem,6vw,5.4rem)] leading-[0.92] tracking-[-0.045em]">
            Manage your chair.
          </h1>
        </div>
      </section>
      <section className="bg-[#eae6dc] py-10 text-[#111] sm:py-16">
        <div className="site-container">
          <ManageAppointment
            token={token}
            confirmationCode={appointment.confirmationCode}
            customerName={appointment.customerName}
            serviceName={appointment.serviceName}
            barberName={appointment.barber.name ?? "Crown & Blade Barber"}
            startsAtLabel={`${formatBookingDate(appointment.startsAt)} at ${formatSlotTime(appointment.startsAt)} ET`}
            statusLabel={appointment.status.replaceAll("_", " ").toLowerCase()}
            priceLabel={formatCurrency(
              appointment.priceCents,
              appointment.currency,
            )}
            paidLabel={formatCurrency(
              appointment.amountPaidCents,
              appointment.currency,
            )}
            balanceLabel={formatCurrency(balanceCents, appointment.currency)}
            balanceCents={balanceCents}
            canChange={canChange}
            policyHours={settings.cancellationWindowHours}
            minDate={getShopDateKey()}
            maxDate={getLastBookableDateKey(settings.bookingWindowDays)}
            currentDate={getShopDateKey(appointment.startsAt)}
            notice={notice}
          />
          <div className="mt-8">
            <Link
              href="/"
              className="text-[10px] font-bold tracking-[0.14em] text-black/45 uppercase hover:text-black"
            >
              ← Return to website
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
