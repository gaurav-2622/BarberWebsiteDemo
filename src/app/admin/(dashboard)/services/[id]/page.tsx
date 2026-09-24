import { ArrowLeft, Archive } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AdminField,
  AdminPageHeader,
  AdminPanel,
  adminInputClassName,
  adminTextareaClassName,
  SubmitButton,
} from "@/components/admin/admin-ui";
import {
  deleteServiceAction,
  updateServiceAction,
} from "@/lib/admin/service-actions";
import { prisma } from "@/lib/prisma";

type EditServicePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    notice?: string | string[];
  }>;
};

export default async function EditServicePage({
  params,
  searchParams,
}: EditServicePageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          appointments: true,
          barbers: true,
        },
      },
    },
  });

  if (!service) {
    notFound();
  }

  const saved =
    (Array.isArray(query.notice) ? query.notice[0] : query.notice) === "saved";

  return (
    <>
      <AdminPageHeader
        eyebrow="Service editor"
        title={service.name}
        description={`${service._count.barbers} barber assignments and ${service._count.appointments} historical appointments.`}
        action={
          <Link
            href="/admin/services"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/15 px-5 text-[10px] font-bold tracking-[0.12em] uppercase"
          >
            <ArrowLeft className="size-4" />
            All services
          </Link>
        }
      />

      {saved ? (
        <p
          role="status"
          className="mt-5 border border-emerald-900/15 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          Service changes saved.
        </p>
      ) : null}

      <AdminPanel title="Service details" className="mt-7">
        <form
          action={updateServiceAction}
          className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4"
        >
          <input type="hidden" name="serviceId" value={service.id} />
          <AdminField label="Service name">
            <input
              name="name"
              defaultValue={service.name}
              required
              maxLength={100}
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="URL slug">
            <input
              name="slug"
              defaultValue={service.slug}
              required
              maxLength={100}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Category">
            <input
              name="category"
              defaultValue={service.category ?? ""}
              maxLength={60}
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Duration (minutes)">
            <input
              name="durationMinutes"
              type="number"
              min={5}
              max={480}
              defaultValue={service.durationMinutes}
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
              defaultValue={service.bufferMinutes}
              required
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Price (USD)">
            <input
              name="price"
              inputMode="decimal"
              defaultValue={(service.priceCents / 100).toFixed(2)}
              required
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Deposit (USD)">
            <input
              name="deposit"
              inputMode="decimal"
              defaultValue={(service.depositCents / 100).toFixed(2)}
              required
              className={adminInputClassName}
            />
          </AdminField>
          <div>
            <span className="mb-2 block text-[9px] font-bold tracking-[0.14em] text-black/55 uppercase">
              Booking availability
            </span>
            <label className="flex h-11 items-center gap-3 border border-black/15 bg-white px-3.5 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={service.isActive}
                className="size-4 accent-[#9a7437]"
              />
              Active online
            </label>
            <span className="mt-1.5 block text-[10px] leading-4 text-black/40">
              Inactive services remain in historical appointments.
            </span>
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <AdminField label="Description">
              <textarea
                name="description"
                defaultValue={service.description ?? ""}
                maxLength={500}
                className={adminTextareaClassName}
              />
            </AdminField>
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <SubmitButton tone="gold">Save service</SubmitButton>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title="Delete or archive" className="mt-7">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="max-w-2xl text-sm leading-6 text-black/50">
            Services with appointment history are archived instead of deleted,
            preserving customer and revenue records.
          </p>
          <form action={deleteServiceAction}>
            <input type="hidden" name="serviceId" value={service.id} />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-red-900 px-5 text-[10px] font-bold tracking-[0.12em] text-white uppercase"
            >
              <Archive className="size-4" />
              Delete / archive
            </button>
          </form>
        </div>
      </AdminPanel>
    </>
  );
}
