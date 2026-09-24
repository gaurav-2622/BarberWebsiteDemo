import type { Metadata } from "next";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { requireOwner } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Owner Dashboard",
    template: "%s | Owner Dashboard",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, settings] = await Promise.all([
    requireOwner(),
    prisma.shopSettings.findUniqueOrThrow({
      where: { id: "default" },
      select: { businessName: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#ece8de] text-[#111] lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <AdminNavigation businessName={settings.businessName} user={session.user} />
      <main id="main-content" className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-[1500px]">{children}</div>
      </main>
    </div>
  );
}
