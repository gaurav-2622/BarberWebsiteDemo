import { Archive, Pencil, Plus, Scissors } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services",
};

import {
  AdminField,
  AdminPageHeader,
  AdminPanel,
  adminInputClassName,
  adminTextareaClassName,
  SubmitButton,
} from "@/components/admin/admin-ui";
import {
  createServiceAction,
  deleteServiceAction,
} from "@/lib/admin/service-actions";
import { formatCurrency, formatDuration } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

type ServicesPageProps = {
  searchParams: Promise<{
    notice?: string | string[];
  }>;
};

export default async function AdminServicesPage({
  searchParams,
}: ServicesPageProps) {
  const query = await searchParams;
  const notice = Array.isArray(query.notice) ? query.notice[0] : query.notice;
  const services = await prisma.service.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          appointments: true,
          barbers: true,
        },
      },
    },
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Menu management"
        title="Services"
        description="Create and price services, control booking duration, and safely archive historical offerings."
        action={
          <a
            href="#create-service"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111] px-5 text-[10px] font-bold tracking-[0.12em] text-white uppercase"
          >
            <Plus className="size-4" />
            Add service
          </a>
        }
      />

      {notice ? <ServiceNotice notice={notice} /> : null}

      <AdminPanel
        title="Current menu"
        eyebrow={`${services.length} total services`}
        className="mt-7"
      >
        <div className="grid gap-px bg-black/10 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.id}
              className="flex min-h-64 flex-col bg-[#f8f5ed] p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#111] text-[#c9a35d]">
                  <Scissors className="size-4" />
                </span>
                <span
                  className={`border px-2 py-1 text-[8px] font-bold tracking-[0.1em] uppercase ${
                    service.isActive
                      ? "border-emerald-800/20 bg-emerald-100 text-emerald-900"
                      : "border-black/10 bg-black/5 text-black/45"
                  }`}
                >
                  {service.isActive ? "Active" : "Archived"}
                </span>
              </div>
              <p className="mt-6 text-[9px] font-bold tracking-[0.14em] text-[#8b672e] uppercase">
                {service.category ?? "Barbering"}
              </p>
              <h2 className="font-display mt-2 text-2xl">{service.name}</h2>
              <p className="mt-3 line-clamp-2 text-xs leading-5 text-black/45">
                {service.description ?? "No description provided."}
              </p>
              <div className="mt-auto grid grid-cols-2 gap-3 border-t border-black/10 pt-5 text-xs">
                <div>
                  <p className="text-[8px] font-bold tracking-[0.1em] text-black/40 uppercase">
                    Price
                  </p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(service.priceCents, service.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-bold tracking-[0.1em] text-black/40 uppercase">
                    Chair time
                  </p>
                  <p className="mt-1 font-semibold">
                    {formatDuration(service.durationMinutes)}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-[9px] text-black/38">
                {service._count.barbers} barber assignments ·{" "}
                {service._count.appointments} appointments
              </p>
              <div className="mt-5 flex gap-2">
                <Link
                  href={`/admin/services/${service.id}`}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#111] text-[9px] font-bold tracking-[0.1em] text-white uppercase"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Link>
                <form action={deleteServiceAction}>
                  <input type="hidden" name="serviceId" value={service.id} />
                  <button
                    type="submit"
                    aria-label={`Delete or archive ${service.name}`}
                    className="flex size-10 items-center justify-center rounded-full border border-red-900/20 text-red-800 transition-colors hover:bg-red-50"
                  >
                    <Archive className="size-3.5" />
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Add a service"
        eyebrow="New menu item"
        className="mt-7 scroll-mt-8"
      >
        <form
          id="create-service"
          action={createServiceAction}
          className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4"
        >
          <AdminField label="Service name">
            <input
              name="name"
              required
              maxLength={100}
              className={adminInputClassName}
              placeholder="Executive Cut"
            />
          </AdminField>
          <AdminField label="URL slug" hint="Lowercase letters, numbers, hyphens.">
            <input
              name="slug"
              required
              maxLength={100}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className={adminInputClassName}
              placeholder="executive-cut"
            />
          </AdminField>
          <AdminField label="Category">
            <input
              name="category"
              maxLength={60}
              className={adminInputClassName}
              placeholder="Haircuts"
            />
          </AdminField>
          <AdminField label="Duration (minutes)">
            <input
              name="durationMinutes"
              type="number"
              min={5}
              max={480}
              defaultValue={45}
              required
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Buffer (minutes)">
            <input
              name="bufferMinutes"
              type="number"
              min={0}
              max={120}
              defaultValue={10}
              required
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Price (USD)">
            <input
              name="price"
              inputMode="decimal"
              defaultValue="45.00"
              required
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Deposit (USD)">
            <input
              name="deposit"
              inputMode="decimal"
              defaultValue="10.00"
              required
              className={adminInputClassName}
            />
          </AdminField>
          <div className="sm:col-span-2 xl:col-span-4">
            <AdminField label="Description">
              <textarea
                name="description"
                maxLength={500}
                className={adminTextareaClassName}
                placeholder="Describe what is included."
              />
            </AdminField>
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <SubmitButton tone="gold">Create service</SubmitButton>
          </div>
        </form>
      </AdminPanel>
    </>
  );
}

function ServiceNotice({ notice }: { notice: string }) {
  const messages: Record<string, string> = {
    archived:
      "Service archived because historical appointments reference it.",
    created: "Service created and assigned to active barbers.",
    deleted: "Service deleted.",
  };

  return (
    <p
      role="status"
      className="mt-5 border border-emerald-900/15 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
    >
      {messages[notice] ?? "Service changes saved."}
    </p>
  );
}
