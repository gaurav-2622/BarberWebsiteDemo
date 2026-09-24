import type { Metadata } from "next";
import Link from "next/link";

import { BookingWizard } from "@/components/booking/booking-wizard";
import { UserRole } from "@/generated/prisma/client";
import {
  getLastBookableDateKey,
  getShopDateKey,
} from "@/lib/booking/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description:
    "Choose your service, barber, date, and time at Crown & Blade Barbershop.",
  openGraph: {
    title: "Book an Appointment | Crown & Blade Barbershop",
    description:
      "Reserve a chair online for haircuts, beard work, and traditional shaves.",
    type: "website",
  },
};

type BookPageProps = {
  searchParams: Promise<{
    payment?: string | string[];
  }>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const query = await searchParams;
  const paymentWasCancelled = query.payment === "cancelled";
  const [settings, services, barbers] = await Promise.all([
    prisma.shopSettings.findUniqueOrThrow({
      where: { id: "default" },
      select: {
        businessName: true,
        bookingEnabled: true,
        onlinePaymentsEnabled: true,
        bookingWindowDays: true,
        minimumLeadTimeMinutes: true,
        phone: true,
      },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        durationMinutes: true,
        bufferMinutes: true,
        priceCents: true,
        depositCents: true,
        currency: true,
      },
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [UserRole.OWNER, UserRole.BARBER] },
      },
      orderBy: [{ role: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        image: true,
        jobTitle: true,
        barberServices: {
          where: { isActive: true },
          select: { serviceId: true },
        },
      },
    }),
  ]);
  const today = getShopDateKey();
  const lastBookableDate = getLastBookableDateKey(
    settings.bookingWindowDays,
  );

  return (
    <main id="main-content" className="min-h-screen bg-[#0b0b0b]">
      <section className="border-b border-white/10 bg-[#101010]">
        <div className="site-container py-12 sm:py-16 lg:py-20">
          <Link
            href="/#services"
            className="text-[10px] font-bold tracking-[0.18em] text-[#c9a35d] uppercase transition-colors hover:text-[#e0bc77]"
          >
            ← Back to services
          </Link>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.55fr] lg:items-end">
            <div>
              <p className="eyebrow">Online booking</p>
              <h1 className="font-display mt-5 max-w-4xl text-[clamp(2.8rem,7vw,6.2rem)] leading-[0.92] tracking-[-0.045em]">
                Your next cut,
                <br />
                <span className="italic text-[#d5ae67]">on your time.</span>
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/55 sm:text-base">
              Choose what you need, see genuinely open times, and hold your
              chair in a few simple steps.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#eae6dc] py-8 text-[#111] sm:py-12 lg:py-16">
        <div className="site-container">
          {settings.bookingEnabled && settings.onlinePaymentsEnabled ? (
            <>
              {paymentWasCancelled ? (
                <div
                  role="status"
                  className="mb-5 border border-amber-900/20 bg-amber-50 px-5 py-4 text-sm text-amber-950"
                >
                  Payment was canceled and no charge was made. Your temporary
                  chair hold will be released automatically when its secure
                  checkout session expires.
                </div>
              ) : null}
              <BookingWizard
                services={services}
                barbers={barbers.map((barber) => ({
                  id: barber.id,
                  name: barber.name ?? "Crown & Blade Barber",
                  image: barber.image,
                  jobTitle: barber.jobTitle,
                  serviceIds: barber.barberServices.map(
                    (assignment) => assignment.serviceId,
                  ),
                }))}
                minDate={today}
                maxDate={lastBookableDate}
                minimumLeadTimeMinutes={settings.minimumLeadTimeMinutes}
              />
            </>
          ) : (
            <div className="border border-black/15 bg-[#f7f4ec] p-8 text-center sm:p-12">
              <p className="eyebrow">Booking paused</p>
              <h2 className="font-display mt-4 text-3xl">
                Online booking is temporarily unavailable.
              </h2>
              <p className="mt-4 text-sm text-black/55">
                Call us at{" "}
                <a className="font-semibold underline" href={`tel:${settings.phone}`}>
                  {settings.phone}
                </a>{" "}
                and we’ll find a time for you.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
