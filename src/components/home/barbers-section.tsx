import { ArrowUpRight, BadgeCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Barber = {
  id: string;
  name: string | null;
  image: string | null;
  jobTitle: string | null;
  bio: string | null;
  role: "OWNER" | "BARBER" | "CUSTOMER";
  services: string[];
};

type BarbersSectionProps = {
  barbers: Barber[];
};

export function BarbersSection({ barbers }: BarbersSectionProps) {
  return (
    <section
      id="barbers"
      className="fine-grid section-space scroll-mt-18 bg-[#0b0b0b]"
    >
      <div className="site-container">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-end lg:gap-20">
          <div>
            <p className="eyebrow">The people behind the chair</p>
            <h2 className="section-title mt-5">
              Meet your
              <br />
              <span className="italic text-[#d5ae67]">barbers.</span>
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
            Different specialties, one shared standard: listen first, work with
            intention, and never rush the finish.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:mt-16 lg:grid-cols-2 lg:gap-8">
          {barbers.map((barber, index) => (
            <article
              key={barber.id}
              className="group overflow-hidden border border-white/10 bg-[#121212]"
            >
              <div className="grid sm:grid-cols-[1.03fr_0.97fr]">
                <div className="relative aspect-[4/5] min-h-[420px] overflow-hidden sm:aspect-auto">
                  <Image
                    src={barber.image ?? "/images/daniel-barber.png"}
                    alt={`${barber.name ?? "Crown & Blade barber"} portrait`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover grayscale-[12%] transition duration-700 group-hover:scale-[1.025] group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent sm:hidden" />
                  <span className="absolute top-4 left-4 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[9px] font-bold tracking-[0.16em] text-white/80 uppercase backdrop-blur-md">
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {String(barbers.length).padStart(2, "0")}
                  </span>
                </div>

                <div className="flex flex-col p-6 sm:p-7 lg:p-8">
                  <div className="flex items-center gap-2 text-[#d5ae67]">
                    <BadgeCheck className="size-4" />
                    <p className="text-[9px] font-bold tracking-[0.17em] uppercase">
                      {barber.role === "OWNER"
                        ? "Owner & master barber"
                        : "Senior barber"}
                    </p>
                  </div>

                  <h3 className="font-display mt-5 text-3xl leading-none text-[#f7f3ea] sm:text-[34px]">
                    {barber.name}
                  </h3>
                  <p className="mt-2 text-xs tracking-[0.1em] text-white/40 uppercase">
                    {barber.jobTitle}
                  </p>
                  <p className="mt-6 text-sm leading-6 text-white/55">
                    {barber.bio}
                  </p>

                  <div className="mt-7 flex flex-wrap gap-2">
                    {barber.services.slice(0, 4).map((service) => (
                      <span
                        key={service}
                        className="rounded-full border border-white/10 px-2.5 py-1.5 text-[9px] font-medium tracking-[0.06em] text-white/50 uppercase"
                      >
                        {service}
                      </span>
                    ))}
                  </div>

                  <Link
                    href="/#services"
                    className="group/link mt-auto inline-flex items-center justify-between border-t border-white/10 pt-7 text-[10px] font-bold tracking-[0.14em] text-[#d5ae67] uppercase"
                  >
                    View services
                    <ArrowUpRight className="size-4 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
