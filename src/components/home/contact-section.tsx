import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

type ContactSectionProps = {
  settings: {
    businessName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
  };
};

export function ContactSection({ settings }: ContactSectionProps) {
  const address = [
    settings.addressLine1,
    settings.addressLine2,
    `${settings.city}, ${settings.state} ${settings.postalCode}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section id="contact" className="scroll-mt-18 bg-[#c9a35d] text-[#0a0a0a]">
      <div className="site-container py-16 sm:py-20 lg:py-24">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto] lg:gap-20">
          <div>
            <p className="text-[10px] font-bold tracking-[0.24em] uppercase opacity-60">
              Your chair is waiting
            </p>
            <h2 className="font-display mt-5 max-w-4xl text-[clamp(2.8rem,6.5vw,6.25rem)] leading-[0.9] tracking-[-0.045em]">
              Ready to look
              <br />
              your best?
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/book"
              className="group inline-flex h-14 min-w-52 items-center justify-between gap-5 rounded-full bg-[#0a0a0a] px-6 text-xs font-bold tracking-[0.14em] text-[#f7f3ea] uppercase transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/50"
            >
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-4" />
                Book now
              </span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-14 min-w-52 items-center justify-center gap-2 rounded-full border border-black/35 px-6 text-xs font-bold tracking-[0.14em] uppercase transition-colors hover:bg-black/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
            >
              <MapPin className="size-4" />
              Get directions
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-black/25 pt-6 text-xs font-medium sm:flex-row sm:items-center sm:justify-between">
          <p>{settings.businessName}</p>
          <p className="opacity-65">{address}</p>
        </div>
      </div>
    </section>
  );
}
