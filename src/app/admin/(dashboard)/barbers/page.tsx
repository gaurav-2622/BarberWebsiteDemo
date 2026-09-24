import { Archive, Pencil, Plus, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Barbers",
};

import {
  AdminField,
  AdminPageHeader,
  AdminPanel,
  adminInputClassName,
  adminTextareaClassName,
  SubmitButton,
} from "@/components/admin/admin-ui";
import { UserRole } from "@/generated/prisma/client";
import {
  createBarberAction,
  deleteBarberAction,
} from "@/lib/admin/barber-actions";
import { prisma } from "@/lib/prisma";

type BarbersPageProps = {
  searchParams: Promise<{
    notice?: string | string[];
  }>;
};

export default async function AdminBarbersPage({
  searchParams,
}: BarbersPageProps) {
  const query = await searchParams;
  const notice = Array.isArray(query.notice) ? query.notice[0] : query.notice;
  const barbers = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.OWNER, UserRole.BARBER] },
    },
    orderBy: [{ isActive: "desc" }, { role: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          barberAppointments: true,
          barberServices: true,
        },
      },
    },
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Team management"
        title="Barbers"
        description="Create barber profiles, control availability, and preserve appointment history when team members leave."
        action={
          <a
            href="#create-barber"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111] px-5 text-[10px] font-bold tracking-[0.12em] text-white uppercase"
          >
            <Plus className="size-4" />
            Add barber
          </a>
        }
      />

      {notice ? <BarberNotice notice={notice} /> : null}

      <AdminPanel
        title="Shop team"
        eyebrow={`${barbers.length} owner and barber profiles`}
        className="mt-7"
      >
        <div className="grid gap-px bg-black/10 md:grid-cols-2 xl:grid-cols-3">
          {barbers.map((barber) => {
            const image =
              barber.image?.startsWith("/")
                ? barber.image
                : "/images/daniel-barber.png";

            return (
              <article
                key={barber.id}
                className="overflow-hidden bg-[#f8f5ed]"
              >
                <div className="relative aspect-[16/9] bg-[#d9d2c4]">
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 420px"
                    className="object-cover object-[center_28%]"
                  />
                  <span
                    className={`absolute top-4 right-4 border px-2 py-1 text-[8px] font-bold tracking-[0.1em] uppercase ${
                      barber.isActive
                        ? "border-emerald-800/20 bg-emerald-100 text-emerald-900"
                        : "border-black/10 bg-[#eee9de] text-black/50"
                    }`}
                  >
                    {barber.isActive ? "Active" : "Archived"}
                  </span>
                </div>
                <div className="p-5 sm:p-6">
                  <p className="text-[9px] font-bold tracking-[0.14em] text-[#8b672e] uppercase">
                    {barber.role === UserRole.OWNER
                      ? "Owner profile"
                      : barber.jobTitle ?? "Barber"}
                  </p>
                  <h2 className="font-display mt-2 text-2xl">
                    {barber.name ?? "Unnamed barber"}
                  </h2>
                  <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-black/45">
                    {barber.bio ?? "No barber biography provided."}
                  </p>
                  <p className="mt-5 text-[9px] text-black/38">
                    {barber._count.barberServices} service assignments ·{" "}
                    {barber._count.barberAppointments} appointments
                  </p>
                  <div className="mt-5 flex gap-2 border-t border-black/10 pt-5">
                    <Link
                      href={`/admin/barbers/${barber.id}`}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#111] text-[9px] font-bold tracking-[0.1em] text-white uppercase"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Link>
                    {barber.role === UserRole.BARBER ? (
                      <form action={deleteBarberAction}>
                        <input type="hidden" name="barberId" value={barber.id} />
                        <button
                          type="submit"
                          aria-label={`Delete or archive ${barber.name ?? "barber"}`}
                          className="flex size-10 items-center justify-center rounded-full border border-red-900/20 text-red-800 transition-colors hover:bg-red-50"
                        >
                          <Archive className="size-3.5" />
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Add a barber"
        eyebrow="New team member"
        className="mt-7"
      >
        <form
          id="create-barber"
          action={createBarberAction}
          className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3"
        >
          <AdminField label="Full name">
            <input
              name="name"
              required
              maxLength={100}
              className={adminInputClassName}
              placeholder="Avery Stone"
            />
          </AdminField>
          <AdminField label="Profile slug">
            <input
              name="slug"
              required
              maxLength={100}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className={adminInputClassName}
              placeholder="avery-stone"
            />
          </AdminField>
          <AdminField label="Job title">
            <input
              name="jobTitle"
              maxLength={100}
              defaultValue="Barber"
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Email (optional)">
            <input
              name="email"
              type="email"
              maxLength={254}
              className={adminInputClassName}
              placeholder="avery@example.com"
            />
          </AdminField>
          <AdminField label="Phone (optional)">
            <input
              name="phone"
              type="tel"
              maxLength={25}
              className={adminInputClassName}
              placeholder="+1 (212) 555-0100"
            />
          </AdminField>
          <AdminField label="Image path">
            <input
              name="image"
              maxLength={500}
              className={adminInputClassName}
              placeholder="/images/avery-barber.png"
            />
          </AdminField>
          <div className="sm:col-span-2 xl:col-span-3">
            <AdminField label="Biography">
              <textarea
                name="bio"
                maxLength={1_000}
                className={adminTextareaClassName}
                placeholder="Specialties, experience, and approach."
              />
            </AdminField>
          </div>
          <div className="sm:col-span-2 xl:col-span-3">
            <p className="mb-4 flex items-center gap-2 text-[10px] text-black/45">
              <UserRound className="size-4 text-[#8b672e]" />
              New barbers receive the standard Monday–Saturday schedule and all
              active services.
            </p>
            <SubmitButton tone="gold">Create barber</SubmitButton>
          </div>
        </form>
      </AdminPanel>
    </>
  );
}

function BarberNotice({ notice }: { notice: string }) {
  const messages: Record<string, string> = {
    archived:
      "Barber archived because historical appointments reference this profile.",
    deleted: "Barber deleted.",
  };

  return (
    <p
      role="status"
      className="mt-5 border border-emerald-900/15 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
    >
      {messages[notice] ?? "Barber changes saved."}
    </p>
  );
}
