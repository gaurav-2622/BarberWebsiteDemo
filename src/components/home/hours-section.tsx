import { ArrowUpRight, CalendarClock, MapPin, Phone } from "lucide-react";
import Image from "next/image";

import { formatMinuteOfDay } from "@/lib/formatters";

type WorkingHour = {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  isActive: boolean;
};

type HoursSectionProps = {
  workingHours: WorkingHour[];
  settings: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
    timeZone: string;
  };
};

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function HoursSection({
  workingHours,
  settings,
}: HoursSectionProps) {
  const timeZoneLabel =
    settings.timeZone === "America/New_York"
      ? "Eastern Time"
      : settings.timeZone.replaceAll("_", " ");
  const orderedHours = [...workingHours].sort(
    (a, b) =>
      (a.dayOfWeek === 0 ? 7 : a.dayOfWeek) -
      (b.dayOfWeek === 0 ? 7 : b.dayOfWeek),
  );
  const address = [
    settings.addressLine1,
    settings.addressLine2,
    `${settings.city}, ${settings.state} ${settings.postalCode}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section
      id="hours"
      className="section-space scroll-mt-18 bg-[#171717]"
    >
      <div className="site-container">
        <div className="overflow-hidden border border-white/10 bg-[#0d0d0d]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[420px] overflow-hidden sm:min-h-[520px]">
              <Image
                src="/images/barbershop-hero.png"
                alt="Inside Crown & Blade Barbershop"
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover object-[72%_center]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/10" />
              <div className="absolute right-0 bottom-0 left-0 p-6 sm:p-9">
                <p className="eyebrow">Find your chair</p>
                <p className="font-display mt-4 max-w-lg text-3xl leading-tight sm:text-4xl">
                  A neighborhood shop,
                  <br />
                  built for the long run.
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-7 inline-flex max-w-md items-start gap-3 text-sm leading-6 text-white/65 transition-colors hover:text-[#d5ae67]"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#d5ae67]" />
                  <span>{address}</span>
                  <ArrowUpRight className="mt-0.5 size-3.5 shrink-0" />
                </a>
              </div>
            </div>

            <div className="p-6 sm:p-9 lg:p-12">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full border border-[#c9a35d]/30 bg-[#c9a35d]/10 text-[#d5ae67]">
                  <CalendarClock className="size-4.5" />
                </span>
                <div>
                  <p className="eyebrow">Business hours</p>
                  <p className="mt-1 text-[11px] text-white/35">
                    Times shown in {timeZoneLabel}
                  </p>
                </div>
              </div>

              <div className="mt-9">
                {orderedHours.map((hours) => (
                  <div
                    key={hours.id}
                    className="flex items-center justify-between gap-6 border-b border-white/10 py-3.5 text-sm"
                  >
                    <span className="text-white/55">
                      {dayNames[hours.dayOfWeek]}
                    </span>
                    <span
                      className={
                        hours.isActive
                          ? "font-medium text-[#f7f3ea]"
                          : "text-white/30"
                      }
                    >
                      {hours.isActive
                        ? `${formatMinuteOfDay(hours.startMinute)} – ${formatMinuteOfDay(hours.endMinute)}`
                        : "Closed"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xs text-xs leading-5 text-white/40">
                  Appointments are recommended. Walk-ins are seated whenever a
                  barber is available.
                </p>
                <a
                  href={`tel:${settings.phone}`}
                  className="inline-flex shrink-0 items-center gap-2 text-xs font-bold tracking-[0.12em] text-[#d5ae67] uppercase"
                >
                  <Phone className="size-3.5" />
                  Call the shop
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
