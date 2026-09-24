import { Scissors } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type SiteLogoProps = {
  businessName: string;
  className?: string;
};

export function SiteLogo({ businessName, className }: SiteLogoProps) {
  const displayName = businessName.replace(/\s+Barbershop$/i, "");

  return (
    <Link
      href="/#top"
      className={cn(
        "group/logo inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a35d]",
        className,
      )}
      aria-label={`${businessName} home`}
    >
      <span className="flex size-10 items-center justify-center rounded-full border border-[#b9934f]/60 bg-[#b9934f]/10 text-[#d5ae67] transition-colors group-hover/logo:bg-[#b9934f] group-hover/logo:text-[#0b0b0b]">
        <Scissors className="size-[18px]" strokeWidth={1.7} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[17px] font-semibold tracking-[0.12em] text-[#f7f3ea] sm:text-[19px]">
          {displayName}
        </span>
        <span className="mt-1 text-[9px] font-semibold tracking-[0.34em] text-[#b9934f]">
          BARBERSHOP
        </span>
      </span>
    </Link>
  );
}
