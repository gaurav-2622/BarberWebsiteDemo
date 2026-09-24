import { ArrowRight, Clock3, Scissors } from "lucide-react";
import Link from "next/link";

import { formatCurrency, formatDuration } from "@/lib/formatters";

type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMinutes: number;
  priceCents: number;
  depositCents: number;
  currency: string;
};

type ServicesSectionProps = {
  services: Service[];
};

export function ServicesSection({ services }: ServicesSectionProps) {
  return (
    <section
      id="services"
      className="section-space scroll-mt-18 bg-[#f1eee6] text-[#111]"
    >
      <div className="site-container">
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.7fr] lg:gap-16">
          <div>
            <p className="eyebrow">Services & pricing</p>
            <h2 className="section-title mt-5 max-w-3xl">
              Straightforward service.
              <br />
              <span className="italic text-[#9a7437]">No surprises.</span>
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-black/60 sm:text-base">
            Every appointment includes a consultation, careful finishing, and
            product guidance that fits your routine. Prices shown are exactly
            what you can expect.
          </p>
        </div>

        <div className="mt-12 grid border-t border-black/15 sm:mt-16 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <article
              key={service.id}
              className="group relative flex min-h-[330px] flex-col border-b border-black/15 p-6 transition-colors hover:bg-[#e8e2d5] sm:p-8 md:[&:nth-child(odd)]:border-r lg:border-r-0 lg:[&:not(:nth-child(3n))]:border-r"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold tracking-[0.2em] text-black/35">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex size-10 items-center justify-center rounded-full border border-black/15 text-[#9a7437] transition-colors group-hover:border-[#9a7437] group-hover:bg-[#9a7437] group-hover:text-white">
                  <Scissors className="size-4" strokeWidth={1.7} />
                </span>
              </div>

              <div className="mt-10">
                <p className="text-[10px] font-bold tracking-[0.18em] text-[#9a7437] uppercase">
                  {service.category ?? "Barbering"}
                </p>
                <h3 className="font-display mt-3 text-[27px] leading-tight">
                  {service.name}
                </h3>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-black/55">
                  {service.description}
                </p>
              </div>

              <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                <div>
                  <p className="font-display text-2xl">
                    {formatCurrency(service.priceCents, service.currency)}
                  </p>
                  {service.depositCents > 0 ? (
                    <p className="mt-1 text-[10px] text-black/40">
                      {formatCurrency(service.depositCents, service.currency)}{" "}
                      deposit
                    </p>
                  ) : null}
                </div>
                <p className="inline-flex items-center gap-1.5 text-xs text-black/50">
                  <Clock3 className="size-3.5 text-[#9a7437]" />
                  {formatDuration(service.durationMinutes)}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-5 border-b border-black/15 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="pb-6 text-xs leading-5 text-black/45">
            Final service time may vary slightly based on consultation and hair
            type.
          </p>
          <Link
            href="/book"
            className="group mb-6 inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[#7e5b29] uppercase"
          >
            Ready for a fresh cut?
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
