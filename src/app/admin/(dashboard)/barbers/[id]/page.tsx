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
import { UserRole } from "@/generated/prisma/client";
import {
  deleteBarberAction,
  updateBarberAction,
  updateBarberScheduleAction,
} from "@/lib/admin/barber-actions";
import { prisma } from "@/lib/prisma";

type EditBarberPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    notice?: string | string[];
  }>;
};

export default async function EditBarberPage({
  params,
  searchParams,
}: EditBarberPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const barber = await prisma.user.findFirst({
    where: {
      id,
      role: { in: [UserRole.OWNER, UserRole.BARBER] },
    },
    include: {
      workingHours: {
        orderBy: { dayOfWeek: "asc" },
      },
      _count: {
        select: {
          barberAppointments: true,
          barberServices: true,
        },
      },
    },
  });

  if (!barber) {
    notFound();
  }

  const notice = Array.isArray(query.notice) ? query.notice[0] : query.notice;

  return (
    <>
      <AdminPageHeader
        eyebrow={
          barber.role === UserRole.OWNER ? "Owner profile" : "Barber editor"
        }
        title={barber.name ?? "Unnamed barber"}
        description={`${barber._count.barberServices} service assignments and ${barber._count.barberAppointments} historical appointments.`}
        action={
          <Link
            href="/admin/barbers"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/15 px-5 text-[10px] font-bold tracking-[0.12em] uppercase"
          >
            <ArrowLeft className="size-4" />
            All barbers
          </Link>
        }
      />

      {notice ? (
        <p
          role="status"
          className="mt-5 border border-emerald-900/15 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {notice === "schedule-saved"
            ? "Weekly schedule saved."
            : "Barber changes saved."}
        </p>
      ) : null}

      <AdminPanel title="Profile details" className="mt-7">
        <form
          action={updateBarberAction}
          className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3"
        >
          <input type="hidden" name="barberId" value={barber.id} />
          <AdminField label="Full name">
            <input
              name="name"
              defaultValue={barber.name ?? ""}
              required
              maxLength={100}
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Profile slug">
            <input
              name="slug"
              defaultValue={barber.slug ?? ""}
              required
              maxLength={100}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Job title">
            <input
              name="jobTitle"
              defaultValue={barber.jobTitle ?? "Barber"}
              maxLength={100}
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField
            label="Email"
            hint={
              barber.role === UserRole.OWNER
                ? "Owner login email is protected here."
                : "Optional public contact email."
            }
          >
            <input
              name="email"
              type="email"
              defaultValue={barber.email ?? ""}
              disabled={barber.role === UserRole.OWNER}
              maxLength={254}
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Phone">
            <input
              name="phone"
              type="tel"
              defaultValue={barber.phone ?? ""}
              maxLength={25}
              className={adminInputClassName}
            />
          </AdminField>
          <AdminField label="Image path">
            <input
              name="image"
              defaultValue={barber.image ?? ""}
              maxLength={500}
              className={adminInputClassName}
            />
          </AdminField>
          <div className="sm:col-span-2 xl:col-span-3">
            <AdminField label="Biography">
              <textarea
                name="bio"
                defaultValue={barber.bio ?? ""}
                maxLength={1_000}
                className={adminTextareaClassName}
              />
            </AdminField>
          </div>
          {barber.role === UserRole.BARBER ? (
            <label className="flex min-h-11 items-center gap-3 border border-black/15 bg-white px-3.5 text-sm sm:col-span-2 xl:col-span-3">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={barber.isActive}
                className="size-4 accent-[#9a7437]"
              />
              Active for online booking
            </label>
          ) : (
            <input type="hidden" name="isActive" value="on" />
          )}
          <div className="sm:col-span-2 xl:col-span-3">
            <SubmitButton tone="gold">Save barber</SubmitButton>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title="Weekly schedule" className="mt-7">
        <form action={updateBarberScheduleAction} className="p-5 sm:p-6">
          <input type="hidden" name="barberId" value={barber.id} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dayNames.map((day, dayOfWeek) => {
              const hours = barber.workingHours.find(
                (entry) => entry.dayOfWeek === dayOfWeek,
              );

              return (
                <fieldset
                  key={day}
                  className="border border-black/12 bg-white p-4"
                >
                  <label className="flex items-center justify-between gap-3 text-xs font-semibold">
                    {day}
                    <input
                      type="checkbox"
                      name={`day-${dayOfWeek}-active`}
                      defaultChecked={hours?.isActive ?? false}
                      className="size-4 accent-[#9a7437]"
                    />
                  </label>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <label className="text-[8px] font-bold tracking-[0.1em] text-black/40 uppercase">
                      Start
                      <input
                        type="time"
                        name={`day-${dayOfWeek}-start`}
                        defaultValue={formatMinuteForInput(
                          hours?.startMinute ?? 9 * 60,
                        )}
                        required
                        className="mt-1 h-9 w-full border border-black/15 px-2 text-xs"
                      />
                    </label>
                    <label className="text-[8px] font-bold tracking-[0.1em] text-black/40 uppercase">
                      End
                      <input
                        type="time"
                        name={`day-${dayOfWeek}-end`}
                        defaultValue={formatMinuteForInput(
                          hours?.endMinute ?? 18 * 60,
                        )}
                        required
                        className="mt-1 h-9 w-full border border-black/15 px-2 text-xs"
                      />
                    </label>
                  </div>
                </fieldset>
              );
            })}
          </div>
          <div className="mt-5">
            <SubmitButton>Save weekly schedule</SubmitButton>
          </div>
        </form>
      </AdminPanel>

      {barber.role === UserRole.BARBER ? (
        <AdminPanel title="Delete or archive" className="mt-7">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p className="max-w-2xl text-sm leading-6 text-black/50">
              Barbers with appointment history are archived instead of
              deleted. Owner profiles cannot be removed here.
            </p>
            <form action={deleteBarberAction}>
              <input type="hidden" name="barberId" value={barber.id} />
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
      ) : null}
    </>
  );
}

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatMinuteForInput(minuteOfDay: number) {
  return `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(
    minuteOfDay % 60,
  ).padStart(2, "0")}`;
}
