"use client";

import {
  CalendarRange,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SiteLogo } from "@/components/site-logo";
import { logoutAction } from "@/lib/admin/auth-actions";

const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Appointments", href: "/admin/appointments", icon: CalendarRange },
  { label: "Services", href: "/admin/services", icon: Scissors },
  { label: "Barbers", href: "/admin/barbers", icon: UsersRound },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

type AdminNavigationProps = {
  businessName: string;
  user: {
    name?: string | null;
    email?: string | null;
  };
};

export function AdminNavigation({
  businessName,
  user,
}: AdminNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/10 bg-[#0c0c0c] p-7 text-white lg:flex">
        <SiteLogo businessName={businessName} />
        <p className="mt-7 border-l border-[#c9a35d] pl-3 text-[9px] font-bold tracking-[0.2em] text-[#c9a35d] uppercase">
          Owner dashboard
        </p>
        <AdminNavLinks pathname={pathname} />
        <AdminAccount user={user} />
      </aside>

      <header className="sticky top-0 z-50 flex h-18 items-center justify-between border-b border-white/10 bg-[#0c0c0c]/95 px-5 text-white backdrop-blur lg:hidden">
        <SiteLogo businessName={businessName} />
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-controls="admin-mobile-navigation"
          aria-label={isOpen ? "Close admin navigation" : "Open admin navigation"}
          className="flex size-10 items-center justify-center rounded-full border border-white/15"
        >
          {isOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </header>

      {isOpen ? (
        <div
          id="admin-mobile-navigation"
          className="fixed inset-0 z-40 bg-[#0c0c0c] px-5 pt-24 pb-7 text-white lg:hidden"
        >
          <p className="text-[9px] font-bold tracking-[0.2em] text-[#c9a35d] uppercase">
            Owner dashboard
          </p>
          <AdminNavLinks pathname={pathname} />
          <AdminAccount user={user} />
        </div>
      ) : null}
    </>
  );
}

function AdminNavLinks({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Admin navigation" className="mt-10">
      <ul className="space-y-1">
        {navigation.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex min-h-11 items-center gap-3 border-l px-4 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-[#c9a35d] bg-white/5 text-white"
                    : "border-white/10 text-white/50 hover:border-white/25 hover:text-white"
                }`}
              >
                <Icon
                  className={`size-4 ${isActive ? "text-[#c9a35d]" : ""}`}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AdminAccount({ user }: { user: AdminNavigationProps["user"] }) {
  return (
    <div className="mt-auto border-t border-white/10 pt-6">
      <p className="truncate text-sm font-semibold">
        {user.name ?? "Shop Owner"}
      </p>
      <p className="mt-1 truncate text-[11px] text-white/40">{user.email}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center gap-2 border border-white/12 text-[9px] font-bold tracking-[0.12em] text-white/55 uppercase transition-colors hover:text-white"
        >
          <ExternalLink className="size-3.5" />
          Website
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center gap-2 border border-white/12 text-[9px] font-bold tracking-[0.12em] text-white/55 uppercase transition-colors hover:text-white"
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
