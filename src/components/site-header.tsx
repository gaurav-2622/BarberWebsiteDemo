"use client";

import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SiteLogo } from "./site-logo";

const navigation = [
  { label: "Home", href: "/#top" },
  { label: "Services", href: "/#services" },
  { label: "Barbers", href: "/#barbers" },
  { label: "Contact", href: "/#contact" },
];

type SiteHeaderProps = {
  businessName: string;
  phone: string;
};

export function SiteHeader({ businessName, phone }: SiteHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/92 backdrop-blur-xl">
      <div className="site-container flex h-[76px] items-center justify-between">
        <SiteLogo businessName={businessName} />

        <nav
          className="hidden items-center gap-8 lg:flex"
          aria-label="Primary navigation"
        >
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-[13px] font-medium tracking-[0.08em] text-white/65 uppercase transition-colors hover:text-[#d5ae67] focus-visible:outline-none focus-visible:text-[#d5ae67]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={`tel:${phone}`}
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 text-white/75 transition-colors hover:border-[#c9a35d]/60 hover:text-[#d5ae67]"
            aria-label={`Call ${businessName}`}
          >
            <Phone className="size-4" />
          </a>
          <Link
            href="/book"
            className={cn(
              buttonVariants(),
              "h-11 rounded-full bg-[#c9a35d] px-5 text-[12px] font-bold tracking-[0.12em] text-[#0b0b0b] uppercase hover:bg-[#e0bc77]",
            )}
          >
            Book now
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 text-[#f7f3ea] transition-colors hover:border-[#c9a35d]/60 hover:text-[#d5ae67] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a35d] lg:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {isOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-x-0 top-[77px] h-[calc(100svh-77px)] bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={closeMenu}
            aria-label="Close navigation overlay"
          />
          <nav
            id="mobile-navigation"
            className="absolute inset-x-0 top-full border-b border-white/10 bg-[#101010] px-5 py-5 shadow-2xl lg:hidden"
            aria-label="Mobile navigation"
          >
            <div className="site-container px-0">
              <div className="flex flex-col">
                {navigation.map((item, index) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeMenu}
                    className="group flex items-center justify-between border-b border-white/10 py-4 text-base font-medium text-[#f7f3ea] transition-colors hover:text-[#d5ae67]"
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-white/30">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
                <a
                  href={`tel:${phone}`}
                  className="inline-flex size-12 items-center justify-center rounded-full border border-white/15 text-[#d5ae67]"
                  aria-label={`Call ${businessName}`}
                >
                  <Phone className="size-4" />
                </a>
                <Link
                  href="/book"
                  onClick={closeMenu}
                  className={cn(
                    buttonVariants(),
                    "h-12 rounded-full bg-[#c9a35d] px-6 text-xs font-bold tracking-[0.12em] text-[#0b0b0b] uppercase hover:bg-[#e0bc77]",
                  )}
                >
                  Book your chair
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}
