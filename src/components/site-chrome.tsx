"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type SiteChromeProps = {
  children: React.ReactNode;
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

export function SiteChrome({ children, settings }: SiteChromeProps) {
  const pathname = usePathname();
  const hidePublicChrome =
    pathname.startsWith("/admin") || pathname.startsWith("/booking/manage");

  if (hidePublicChrome) {
    return children;
  }

  return (
    <>
      <SiteHeader
        businessName={settings.businessName}
        phone={settings.phone}
      />
      {children}
      <SiteFooter settings={settings} />
    </>
  );
}
