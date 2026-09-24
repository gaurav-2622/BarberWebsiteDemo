import type { Metadata } from "next";

import { BarbersSection } from "@/components/home/barbers-section";
import { ContactSection } from "@/components/home/contact-section";
import { HeroSection } from "@/components/home/hero-section";
import { HoursSection } from "@/components/home/hours-section";
import { ReviewsSection } from "@/components/home/reviews-section";
import { ServicesSection } from "@/components/home/services-section";
import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.shopSettings.findUnique({
    where: { id: "default" },
    select: {
      businessName: true,
      tagline: true,
      description: true,
      city: true,
      state: true,
    },
  });

  const title = settings?.businessName ?? "Crown & Blade Barbershop";
  const description =
    settings?.description ??
    settings?.tagline ??
    "Book premium haircuts, beard services, and traditional shaves online.";

  return {
    title: {
      absolute: title,
    },
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Home() {
  const [settings, services, team] = await Promise.all([
    prisma.shopSettings.findUniqueOrThrow({
      where: { id: "default" },
      select: {
        businessName: true,
        tagline: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        timeZone: true,
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
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        image: true,
        jobTitle: true,
        bio: true,
        role: true,
        workingHours: {
          orderBy: { dayOfWeek: "asc" },
          select: {
            id: true,
            dayOfWeek: true,
            startMinute: true,
            endMinute: true,
            isActive: true,
          },
        },
        barberServices: {
          where: {
            isActive: true,
            service: { isActive: true },
          },
          select: {
            service: {
              select: {
                name: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const barbers = team
    .sort((a, b) => {
      if (a.role === b.role) {
        return (a.name ?? "").localeCompare(b.name ?? "");
      }

      return a.role === UserRole.OWNER ? -1 : 1;
    })
    .map((barber) => ({
      id: barber.id,
      name: barber.name,
      image: barber.image,
      jobTitle: barber.jobTitle,
      bio: barber.bio,
      role: barber.role,
      services: barber.barberServices
        .sort((a, b) => a.service.sortOrder - b.service.sortOrder)
        .map(({ service }) => service.name),
    }));
  const primaryBarber =
    team.find((barber) => barber.role === UserRole.OWNER) ?? team[0];

  return (
    <main id="main-content">
      <HeroSection
        businessName={settings.businessName}
        tagline={settings.tagline}
        city={settings.city}
        state={settings.state}
        serviceCount={services.length}
      />

      <div className="border-y border-white/10 bg-[#0d0d0d]">
        <div className="site-container grid grid-cols-2 divide-x divide-white/10 sm:grid-cols-4">
          {[
            ["01", "Precision first"],
            ["02", "Real prices"],
            ["03", "Unhurried service"],
            ["04", "Built for you"],
          ].map(([number, label]) => (
            <div
              key={number}
              className="flex items-center gap-3 px-3 py-5 sm:px-5 lg:py-6"
            >
              <span className="font-display text-sm text-[#d5ae67]">
                {number}
              </span>
              <span className="text-[9px] font-semibold tracking-[0.12em] text-white/45 uppercase sm:text-[10px]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ServicesSection services={services} />
      <BarbersSection barbers={barbers} />
      <HoursSection
        workingHours={primaryBarber?.workingHours ?? []}
        settings={settings}
      />
      <ReviewsSection />
      <ContactSection settings={settings} />
    </main>
  );
}
