import { ArrowDown, ArrowRight, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type HeroSectionProps = {
  businessName: string;
  tagline: string | null;
  city: string;
  state: string;
  serviceCount: number;
};

export function HeroSection({
  businessName,
  tagline,
  city,
  state,
  serviceCount,
}: HeroSectionProps) {
  return (
    <section
      id="top"
      className="relative isolate min-h-[calc(100svh-76px)] overflow-hidden"
    >
      <Image
        src="/images/barbershop-hero.png"
        alt="Premium black and brass barbershop interior"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[66%_center] sm:object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.98)_0%,rgba(5,5,5,0.88)_38%,rgba(5,5,5,0.2)_75%,rgba(5,5,5,0.08)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,5,5,0.88)_0%,transparent_45%,rgba(5,5,5,0.2)_100%)]" />
      <div className="absolute inset-0 bg-black/25 sm:bg-transparent" />

      <div className="site-container relative z-10 flex min-h-[calc(100svh-76px)] flex-col justify-between py-10 sm:py-14 lg:py-16">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/20 px-3.5 py-2 text-[10px] font-semibold tracking-[0.16em] text-white/70 uppercase backdrop-blur-md">
            <MapPin className="size-3.5 text-[#d5ae67]" />
            {city}, {state}
          </div>
          <p className="hidden text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase sm:block">
            By appointment · Walk-ins welcome
          </p>
        </div>

        <div className="max-w-[800px] py-14 sm:py-16 lg:py-20">
          <p className="eyebrow mb-6 sm:mb-8">
            {tagline ?? "Classic craft. Modern style."}
          </p>
          <h1 className="display-title text-[#f7f3ea]">
            Look sharp.
            <br />
            <span className="italic text-[#d5ae67]">Feel like yourself.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-white/65 sm:mt-9 sm:text-lg sm:leading-8">
            Thoughtful cuts, clean shaves, and honest service—delivered by
            barbers who take the time to get it right.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center">
            <Link
              href="/book"
              className="group inline-flex h-13 items-center justify-center gap-3 rounded-full bg-[#c9a35d] px-7 text-xs font-bold tracking-[0.14em] text-[#090909] uppercase transition-colors hover:bg-[#e0bc77] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0d19a] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Book your chair
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/#barbers"
              className="inline-flex h-13 items-center justify-center rounded-full border border-white/20 bg-black/20 px-7 text-xs font-bold tracking-[0.14em] text-white uppercase backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Meet the barbers
            </Link>
          </div>
        </div>

        <div className="flex items-end justify-between gap-6 border-t border-white/15 pt-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div>
              <div className="flex items-center gap-1 text-[#d5ae67]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className="size-3.5 fill-current"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-white/50">
                Rated 4.9 by local clients
              </p>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div>
              <p className="font-display text-xl text-[#f7f3ea]">
                {serviceCount}
              </p>
              <p className="mt-1 text-[10px] tracking-[0.12em] text-white/45 uppercase">
                Signature services
              </p>
            </div>
          </div>

          <Link
            href="/#services"
            className="hidden size-11 items-center justify-center rounded-full border border-white/20 text-white/60 transition-colors hover:border-[#c9a35d]/60 hover:text-[#d5ae67] sm:inline-flex"
            aria-label={`Explore ${businessName} services`}
          >
            <ArrowDown className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
