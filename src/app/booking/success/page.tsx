import {
  CheckCircle2,
  Clock3,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  AppointmentStatus,
  PaymentStatus,
} from "@/generated/prisma/client";
import {
  formatBookingDate,
  formatSlotTime,
  SHOP_TIME_ZONE,
} from "@/lib/booking/time";
import { formatCurrency } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking Payment",
  description: "Review the payment status for your Crown & Blade appointment.",
  robots: {
    index: false,
    follow: false,
  },
};

type BookingSuccessPageProps = {
  searchParams: Promise<{
    session_id?: string | string[];
  }>;
};

function parseSessionId(value: string | string[] | undefined) {
  const sessionId = Array.isArray(value) ? value[0] : value;

  if (
    !sessionId ||
    sessionId.length > 255 ||
    !/^cs_[A-Za-z0-9_]+$/.test(sessionId)
  ) {
    return null;
  }

  return sessionId;
}

export default async function BookingSuccessPage({
  searchParams,
}: BookingSuccessPageProps) {
  const query = await searchParams;
  const sessionId = parseSessionId(query.session_id);
  const appointment = sessionId
    ? await prisma.appointment.findUnique({
        where: { stripeCheckoutSessionId: sessionId },
        select: {
          confirmationCode: true,
          managementToken: true,
          serviceName: true,
          startsAt: true,
          status: true,
          paymentStatus: true,
          priceCents: true,
          amountPaidCents: true,
          currency: true,
          barber: {
            select: { name: true },
          },
        },
      })
    : null;
  const isConfirmed =
    appointment?.status === AppointmentStatus.CONFIRMED &&
    appointment.paymentStatus === PaymentStatus.PAID;
  const isProcessing =
    appointment?.status === AppointmentStatus.PENDING_PAYMENT;

  return (
    <main id="main-content" className="min-h-screen bg-[#0b0b0b]">
      <section className="border-b border-white/10 bg-[#101010]">
        <div className="site-container py-12 sm:py-16 lg:py-20">
          <p className="eyebrow">Secure booking</p>
          <h1 className="font-display mt-5 max-w-4xl text-[clamp(2.8rem,7vw,6rem)] leading-[0.92] tracking-[-0.045em]">
            {isConfirmed
              ? "Your chair is confirmed."
              : isProcessing
                ? "We’re confirming your payment."
                : "Let’s check your booking."}
          </h1>
        </div>
      </section>

      <section className="bg-[#eae6dc] py-10 text-[#111] sm:py-16 lg:py-20">
        <div className="site-container">
          <div className="mx-auto max-w-5xl overflow-hidden border border-black/15 bg-[#f7f4ec] shadow-[0_25px_80px_rgba(0,0,0,0.12)]">
            <div className="grid lg:grid-cols-[0.62fr_1fr]">
              <div className="flex min-h-72 items-center justify-center bg-[#111] p-8 text-center text-white">
                <div>
                  <span
                    className={`mx-auto flex size-20 items-center justify-center rounded-full border ${
                      isConfirmed
                        ? "border-[#c9a35d]/35 bg-[#c9a35d]/10 text-[#d5ae67]"
                        : "border-white/15 bg-white/5 text-white/65"
                    }`}
                  >
                    {isConfirmed ? (
                      <CheckCircle2 className="size-9" strokeWidth={1.5} />
                    ) : (
                      <Clock3 className="size-9" strokeWidth={1.5} />
                    )}
                  </span>
                  <p className="mt-6 text-[10px] font-bold tracking-[0.2em] text-[#c9a35d] uppercase">
                    {isConfirmed
                      ? "Payment received"
                      : isProcessing
                        ? "Confirmation in progress"
                        : "Payment status unavailable"}
                  </p>
                  {appointment ? (
                    <p className="font-display mt-3 text-3xl">
                      {appointment.confirmationCode}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="p-6 sm:p-10 lg:p-12">
                {isConfirmed && appointment ? (
                  <ConfirmedBooking appointment={appointment} />
                ) : isProcessing && appointment && sessionId ? (
                  <ProcessingBooking
                    confirmationCode={appointment.confirmationCode}
                    sessionId={sessionId}
                  />
                ) : (
                  <UnavailableBooking />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

type ConfirmedAppointment = {
  confirmationCode: string;
  managementToken: string;
  serviceName: string;
  startsAt: Date;
  priceCents: number;
  amountPaidCents: number;
  currency: string;
  barber: {
    name: string | null;
  };
};

function ConfirmedBooking({
  appointment,
}: {
  appointment: ConfirmedAppointment;
}) {
  const balanceCents = Math.max(
    appointment.priceCents - appointment.amountPaidCents,
    0,
  );

  return (
    <>
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-900/15 bg-emerald-100 px-3 py-1.5 text-[9px] font-bold tracking-[0.13em] text-emerald-950 uppercase">
        <ShieldCheck className="size-3.5" />
        Confirmed
      </span>
      <h2 className="font-display mt-6 text-4xl tracking-[-0.03em] sm:text-5xl">
        Payment received.
      </h2>
      <p className="mt-4 max-w-xl text-sm leading-6 text-black/50">
        Your appointment is confirmed. Keep your confirmation code handy when
        you arrive.
      </p>

      <dl className="mt-8 grid gap-px overflow-hidden border border-black/12 bg-black/12 sm:grid-cols-2">
        <PaymentDetail label="Service" value={appointment.serviceName} />
        <PaymentDetail
          label="Date & time"
          value={`${formatBookingDate(appointment.startsAt)} at ${formatSlotTime(appointment.startsAt)} ${SHOP_TIME_ZONE === "America/New_York" ? "ET" : ""}`}
        />
        <PaymentDetail
          label="Barber"
          value={appointment.barber.name ?? "Crown & Blade Barber"}
        />
        <PaymentDetail
          label={
            balanceCents > 0 ? "Deposit paid" : "Payment received"
          }
          value={formatCurrency(
            appointment.amountPaidCents,
            appointment.currency,
          )}
        />
      </dl>

      {balanceCents > 0 ? (
        <p className="mt-5 text-xs leading-5 text-black/48">
          Remaining balance due at the shop:{" "}
          <strong>
            {formatCurrency(balanceCents, appointment.currency)}
          </strong>
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/booking/manage/${appointment.managementToken}`}
          className="inline-flex h-12 items-center justify-center rounded-full bg-[#111] px-6 text-xs font-bold tracking-[0.12em] text-white uppercase"
        >
          Manage appointment
        </Link>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-full border border-black/20 px-6 text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-black/5"
        >
          Return home
        </Link>
      </div>
    </>
  );
}

function ProcessingBooking({
  confirmationCode,
  sessionId,
}: {
  confirmationCode: string;
  sessionId: string;
}) {
  return (
    <>
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-900/15 bg-amber-100 px-3 py-1.5 text-[9px] font-bold tracking-[0.13em] text-amber-950 uppercase">
        <Clock3 className="size-3.5" />
        Processing
      </span>
      <h2 className="font-display mt-6 text-4xl tracking-[-0.03em] sm:text-5xl">
        Stripe returned you safely.
      </h2>
      <p className="mt-4 max-w-xl text-sm leading-6 text-black/50">
        We’re waiting for Stripe’s signed payment confirmation. This usually
        takes only a few seconds. Your reference is {confirmationCode}.
      </p>
      <Link
        href={`/booking/success?session_id=${encodeURIComponent(sessionId)}`}
        className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#111] px-6 text-xs font-bold tracking-[0.12em] text-white uppercase"
      >
        <Clock3 className="size-4" />
        Refresh status
      </Link>
    </>
  );
}

function UnavailableBooking() {
  return (
    <>
      <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-3 py-1.5 text-[9px] font-bold tracking-[0.13em] text-black/60 uppercase">
        <CreditCard className="size-3.5" />
        Booking not found
      </span>
      <h2 className="font-display mt-6 text-4xl tracking-[-0.03em] sm:text-5xl">
        We can’t show this payment yet.
      </h2>
      <p className="mt-4 max-w-xl text-sm leading-6 text-black/50">
        The secure session link may be missing or expired. No appointment is
        confirmed from this page alone.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/book"
          className="inline-flex h-12 items-center justify-center rounded-full bg-[#111] px-6 text-xs font-bold tracking-[0.12em] text-white uppercase"
        >
          Start a booking
        </Link>
        <Link
          href="/#contact"
          className="inline-flex h-12 items-center justify-center rounded-full border border-black/20 px-6 text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-black/5"
        >
          Contact the shop
        </Link>
      </div>
    </>
  );
}

function PaymentDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-5">
      <dt className="text-[9px] font-bold tracking-[0.13em] text-[#8b672e] uppercase">
        {label}
      </dt>
      <dd className="font-display mt-2 text-lg">{value}</dd>
    </div>
  );
}
