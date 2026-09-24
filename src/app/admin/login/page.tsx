import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SiteLogo } from "@/components/site-logo";
import { UserRole } from "@/generated/prisma/client";
import { loginAction } from "@/lib/admin/auth-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner Login",
  robots: {
    index: false,
    follow: false,
  },
};

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

const loginErrors: Record<string, string> = {
  "invalid-credentials": "The email or password is incorrect.",
  "rate-limited": "Too many sign-in attempts. Please wait and try again.",
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const [session, query] = await Promise.all([auth(), searchParams]);

  if (session?.user.role === UserRole.OWNER) {
    redirect("/admin");
  }

  const errorKey = Array.isArray(query.error) ? query.error[0] : query.error;
  const errorMessage = errorKey ? loginErrors[errorKey] : undefined;

  return (
    <main
      id="main-content"
      className="fine-grid flex min-h-screen items-center justify-center bg-[#0b0b0b] px-5 py-12 text-[#f7f3ea]"
    >
      <div className="w-full max-w-md border border-white/10 bg-[#111] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 p-7 sm:p-9">
          <SiteLogo businessName="Crown & Blade Barbershop" />
          <div className="mt-10 flex size-12 items-center justify-center rounded-full border border-[#c9a35d]/30 bg-[#c9a35d]/10 text-[#d5ae67]">
            <LockKeyhole className="size-5" />
          </div>
          <p className="mt-7 text-[10px] font-bold tracking-[0.2em] text-[#c9a35d] uppercase">
            Private administration
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-[-0.035em] sm:text-5xl">
            Owner sign in
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/50">
            Manage the shop schedule, team, services, and payments.
          </p>
        </div>

        <form action={loginAction} className="space-y-5 p-7 sm:p-9">
          {errorMessage ? (
            <p
              role="alert"
              className="border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            >
              {errorMessage}
            </p>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-[10px] font-bold tracking-[0.14em] text-white/55 uppercase">
              Owner email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              className="h-12 w-full border border-white/15 bg-black/25 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#c9a35d] focus:ring-2 focus:ring-[#c9a35d]/15"
              placeholder="owner@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] font-bold tracking-[0.14em] text-white/55 uppercase">
              Password
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              minLength={12}
              maxLength={128}
              className="h-12 w-full border border-white/15 bg-black/25 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#c9a35d] focus:ring-2 focus:ring-[#c9a35d]/15"
              placeholder="••••••••••••"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#c9a35d] px-6 text-xs font-bold tracking-[0.13em] text-black uppercase transition-colors hover:bg-[#dfbd7c]"
          >
            Sign in securely
            <ArrowRight className="size-4" />
          </button>

          <div className="flex items-start gap-2.5 border-t border-white/10 pt-5 text-[11px] leading-5 text-white/40">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#c9a35d]" />
            <p>Access is limited to active owner accounts.</p>
          </div>
        </form>

        <div className="border-t border-white/10 px-7 py-5 text-center sm:px-9">
          <Link
            href="/"
            className="text-[10px] font-bold tracking-[0.14em] text-white/45 uppercase transition-colors hover:text-[#d5ae67]"
          >
            ← Return to website
          </Link>
        </div>
      </div>
    </main>
  );
}
