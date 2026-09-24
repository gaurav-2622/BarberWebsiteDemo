import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteChrome } from "@/components/site-chrome";
import { prisma } from "@/lib/prisma";
import { getMetadataBase } from "@/lib/seo";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "Crown & Blade Barbershop",
    template: "%s | Crown & Blade Barbershop",
  },
  description:
    "Book premium haircuts, beard services, and traditional shaves online at Crown & Blade Barbershop in New York.",
  keywords: [
    "barbershop",
    "haircut",
    "beard trim",
    "hot towel shave",
    "New York barber",
    "Crown & Blade",
  ],
  openGraph: {
    title: "Crown & Blade Barbershop",
    description: "Classic craft. Modern style. Book your next cut online.",
    type: "website",
    locale: "en_US",
    siteName: "Crown & Blade Barbershop",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crown & Blade Barbershop",
    description: "Classic craft. Modern style. Book your next cut online.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await prisma.shopSettings.findUniqueOrThrow({
    where: { id: "default" },
    select: {
      businessName: true,
      tagline: true,
      email: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      instagramUrl: true,
      facebookUrl: true,
    },
  });

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#0b0b0b] text-[#f7f3ea] antialiased`}
      >
        <a
          href="#main-content"
          className="fixed top-3 left-3 z-[100] -translate-y-20 rounded-full bg-[#c9a35d] px-4 py-2 text-sm font-semibold text-black transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <SiteChrome settings={settings}>{children}</SiteChrome>
      </body>
    </html>
  );
}
