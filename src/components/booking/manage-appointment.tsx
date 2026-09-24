"use client";

import { CalendarClock, CircleDollarSign, Scissors } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  cancelManagedBookingAction,
  rescheduleManagedBookingAction,
} from "@/lib/booking/manage-actions";

type ManageAppointmentProps = {
  token: string;
  confirmationCode: string;
  customerName: string;
  serviceName: string;
  barberName: string;
  startsAtLabel: string;
  statusLabel: string;
  priceLabel: string;
  paidLabel: string;
  balanceLabel: string;
  balanceCents: number;
  canChange: boolean;
  policyHours: number;
  minDate: string;
  maxDate: string;
  currentDate: string;
  notice?: string;
};

type AvailabilitySlot = {
  start: string;
  end: string;
  label: string;
};

const noticeCopy: Record<string, string> = {
  cancelled: "This appointment has been cancelled.",
  rescheduled: "Your appointment time has been updated.",
  policy_window:
    "This appointment is inside the shop’s change window and can no longer be edited online.",
  not_changeable: "This appointment can no longer be changed online.",
  slot_unavailable: "That time is no longer available. Choose another slot.",
  invalid_time: "Choose a valid date and time to reschedule.",
  not_found: "This booking link is invalid or has expired.",
};

export function ManageAppointment(props: ManageAppointmentProps) {
  const [date, setDate] = useState(props.currentDate);
  const [startsAt, setStartsAt] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const notice = props.notice ? noticeCopy[props.notice] : null;
  const remainingLabel = useMemo(
    () =>
      props.balanceCents > 0
        ? `${props.balanceLabel} due at the shop`
        : "Paid in full",
    [props.balanceCents, props.balanceLabel],
  );

  useEffect(() => {
    if (!props.canChange || !date) {
      return;
    }

    const controller = new AbortController();
    setLoadingSlots(true);
    setSlotError(null);
    setStartsAt("");

    fetch(`/api/booking/manage/${props.token}/availability?date=${date}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          slots?: AvailabilitySlot[];
          error?: { message?: string };
        };

        if (!response.ok) {
          throw new Error(
            payload.error?.message ?? "Available times could not be loaded.",
          );
        }

        setSlots(payload.slots ?? []);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setSlots([]);
        setSlotError(
          error instanceof Error
            ? error.message
            : "Available times could not be loaded.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingSlots(false);
        }
      });

    return () => controller.abort();
  }, [date, props.canChange, props.token]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="border border-black/12 bg-[#f7f4ec] p-6 sm:p-8">
        {notice ? (
          <p
            role="status"
            className="mb-6 border border-emerald-900/15 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          >
            {notice}
          </p>
        ) : null}
        <p className="text-[10px] font-bold tracking-[0.18em] text-[#8b672e] uppercase">
          Appointment details
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-[-0.035em] sm:text-5xl">
          {props.confirmationCode}
        </h1>
        <p className="mt-3 text-sm text-black/50">
          Hello {props.customerName}. Review your visit, remaining balance, and
          change options.
        </p>
        <dl className="mt-8 grid gap-px overflow-hidden border border-black/12 bg-black/12 sm:grid-cols-2">
          <Detail
            icon={<Scissors className="size-4" />}
            label="Service"
            value={props.serviceName}
          />
          <Detail label="Barber" value={props.barberName} />
          <Detail
            icon={<CalendarClock className="size-4" />}
            label="When"
            value={props.startsAtLabel}
          />
          <Detail label="Status" value={props.statusLabel} />
          <Detail
            icon={<CircleDollarSign className="size-4" />}
            label="Total"
            value={props.priceLabel}
          />
          <Detail label="Paid so far" value={props.paidLabel} />
        </dl>
        <p className="mt-5 text-sm text-black/55">{remainingLabel}</p>
      </section>

      <section className="border border-black/12 bg-white p-6 sm:p-8">
        <p className="text-[10px] font-bold tracking-[0.18em] text-[#8b672e] uppercase">
          Manage booking
        </p>
        <h2 className="font-display mt-3 text-3xl">Change or cancel</h2>
        {props.canChange ? (
          <>
            <p className="mt-3 text-sm leading-6 text-black/50">
              Changes are allowed until {props.policyHours} hours before your
              appointment.
            </p>
            <form action={rescheduleManagedBookingAction} className="mt-6 space-y-4">
              <input type="hidden" name="token" value={props.token} />
              <label className="block">
                <span className="mb-2 block text-[10px] font-bold tracking-[0.12em] text-black/45 uppercase">
                  New date
                </span>
                <input
                  type="date"
                  name="date"
                  min={props.minDate}
                  max={props.maxDate}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  className="h-12 w-full border border-black/15 bg-[#f7f4ec] px-4 text-sm outline-none focus:border-[#c9a35d]"
                />
              </label>
              <div>
                <p className="mb-2 text-[10px] font-bold tracking-[0.12em] text-black/45 uppercase">
                  New time
                </p>
                {loadingSlots ? (
                  <p className="text-sm text-black/45">Loading open chairs…</p>
                ) : null}
                {slotError ? (
                  <p className="text-sm text-red-800">{slotError}</p>
                ) : null}
                <div className="grid max-h-56 grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">
                  {slots.map((slot) => (
                    <label
                      key={slot.start}
                      className={`flex min-h-11 cursor-pointer items-center justify-center border px-2 text-xs font-semibold ${
                        startsAt === slot.start
                          ? "border-[#c9a35d] bg-[#c9a35d]/15"
                          : "border-black/12"
                      }`}
                    >
                      <input
                        type="radio"
                        name="startsAt"
                        value={slot.start}
                        checked={startsAt === slot.start}
                        onChange={() => setStartsAt(slot.start)}
                        className="sr-only"
                        required
                      />
                      {slot.label}
                    </label>
                  ))}
                </div>
                {slots.length === 0 && !loadingSlots && !slotError ? (
                  <p className="text-sm text-black/45">
                    No times are open on this date.
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={!startsAt}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#111] px-5 text-[10px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-40"
              >
                Reschedule appointment
              </button>
            </form>
            <form action={cancelManagedBookingAction} className="mt-4">
              <input type="hidden" name="token" value={props.token} />
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-red-900/20 px-5 text-[10px] font-bold tracking-[0.12em] text-red-800 uppercase"
              >
                Cancel appointment
              </button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm leading-6 text-black/50">
            Online changes are no longer available for this appointment. Call
            the shop if you need help.
          </p>
        )}
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="bg-[#fbf8f1] p-5">
      <dt className="flex items-center gap-2 text-[9px] font-bold tracking-[0.13em] text-[#8b672e] uppercase">
        {icon}
        {label}
      </dt>
      <dd className="font-display mt-2 text-lg">{value}</dd>
    </div>
  );
}
