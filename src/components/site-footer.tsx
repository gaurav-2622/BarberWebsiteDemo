import {
  ArrowUp,
  Camera,
  Globe2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import Link from "next/link";

import { SiteLogo } from "./site-logo";

type SiteFooterProps = {
  settings: {
    businessName: string;
    tagline: string | null;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    instagramUrl: string | null;
    facebookUrl: string | null;
  };
};

const footerNavigation = [
  { label: "Home", href: "/#top" },
  { label: "Services", href: "/#services" },
  { label: "Our Barbers", href: "/#barbers" },
  { label: "Hours", href: "/#hours" },
  { label: "Contact", href: "/#contact" },
];

export function SiteFooter({ settings }: SiteFooterProps) {
  const address = [
    settings.addressLine1,
    settings.addressLine2,
    `${settings.city}, ${settings.state} ${settings.postalCode}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <footer className="border-t border-white/10 bg-[#080808]">
      <div className="h-px bg-gradient-to-r from-transparent via-[#c9a35d]/80 to-transparent" />
      <div className="site-container py-14 sm:py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.7fr_1fr] lg:gap-16">
          <div>
            <SiteLogo businessName={settings.businessName} />
            <p className="mt-6 max-w-sm text-sm leading-7 text-white/55">
              {settings.tagline ??
                "Precision cuts, honest service, and a chair that always feels like yours."}
            </p>
            <div className="mt-7 flex items-center gap-3">
              {settings.instagramUrl ? (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors hover:border-[#c9a35d]/60 hover:text-[#d5ae67]"
                  aria-label="Instagram"
                >
                  <Camera className="size-4" />
                </a>
              ) : null}
              {settings.facebookUrl ? (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors hover:border-[#c9a35d]/60 hover:text-[#d5ae67]"
                  aria-label="Facebook"
                >
                  <Globe2 className="size-4" />
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <p className="eyebrow">Explore</p>
            <nav className="mt-6 flex flex-col items-start gap-3.5">
              {footerNavigation.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm text-white/60 transition-colors hover:text-[#d5ae67]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="eyebrow">Visit the shop</p>
            <div className="mt-6 space-y-4 text-sm leading-6 text-white/60">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 transition-colors hover:text-[#d5ae67]"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#c9a35d]" />
                <span>{address}</span>
              </a>
              <a
                href={`tel:${settings.phone}`}
                className="flex items-center gap-3 transition-colors hover:text-[#d5ae67]"
              >
                <Phone className="size-4 shrink-0 text-[#c9a35d]" />
                <span>{settings.phone}</span>
              </a>
              <a
                href={`mailto:${settings.email}`}
                className="flex items-center gap-3 transition-colors hover:text-[#d5ae67]"
              >
                <Mail className="size-4 shrink-0 text-[#c9a35d]" />
                <span>{settings.email}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-white/10 pt-7 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.businessName}. All rights
            reserved.
          </p>
          <Link
            href="/#top"
            className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-white/50 uppercase transition-colors hover:text-[#d5ae67]"
          >
            Back to top
            <ArrowUp className="size-3.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
