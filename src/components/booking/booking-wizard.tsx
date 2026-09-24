"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  LoaderCircle,
  Mail,
  NotebookPen,
  Phone,
  RefreshCw,
  Scissors,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { formatCurrency, formatDuration } from "@/lib/formatters";

type BookingService = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  priceCents: number;
  depositCents: number;
  currency: string;
};

type BookingBarber = {
  id: string;
  name: string;
  image: string | null;
  jobTitle: string | null;
  serviceIds: string[];
};

type AvailabilitySlot = {
  start: string;
  end: string;
  label: string;
  barberIds: string[];
};

type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

type BookingWizardProps = {
  services: BookingService[];
  barbers: BookingBarber[];
  minDate: string;
  maxDate: string;
  minimumLeadTimeMinutes: number;
};

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

const steps: Array<{ number: StepNumber; label: string; shortLabel: string }> = [
  { number: 1, label: "Select service", shortLabel: "Service" },
  { number: 2, label: "Select barber", shortLabel: "Barber" },
  { number: 3, label: "Select date", shortLabel: "Date" },
  { number: 4, label: "Select time", shortLabel: "Time" },
  { number: 5, label: "Your details", shortLabel: "Details" },
  { number: 6, label: "Review booking", shortLabel: "Review" },
];

const stepCopy: Record<
  StepNumber,
  { eyebrow: string; title: string; description: string }
> = {
  1: {
    eyebrow: "Step 1 of 6",
    title: "What can we do for you?",
    description: "Choose one service to see the right barbers and open times.",
  },
  2: {
    eyebrow: "Step 2 of 6",
    title: "Choose your barber.",
    description:
      "Pick your preferred barber, or let us match you with the first available chair.",
  },
  3: {
    eyebrow: "Step 3 of 6",
    title: "Choose a date.",
    description: "Availability is calculated in Eastern Time.",
  },
  4: {
    eyebrow: "Step 4 of 6",
    title: "Pick an open time.",
    description:
      "These slots account for service time, reset time, existing bookings, and blocked schedules.",
  },
  5: {
    eyebrow: "Step 5 of 6",
    title: "Tell us who’s coming.",
    description:
      "We’ll use these details for this booking and its confirmation.",
  },
  6: {
    eyebrow: "Step 6 of 6",
    title: "Review your appointment.",
    description:
      "We’ll hold your chair while you complete secure payment with Stripe.",
  },
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const inputClassName =
  "h-12 w-full rounded-none border border-black/15 bg-white px-4 text-sm text-[#111] outline-none transition-colors placeholder:text-black/30 focus:border-[#9a7437] focus:ring-2 focus:ring-[#c9a35d]/20";

export function BookingWizard({
  services,
  barbers,
  minDate,
  maxDate,
  minimumLeadTimeMinutes,
}: BookingWizardProps) {
  const [step, setStep] = useState<StepNumber>(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string>("any");
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] =
    useState<AvailabilitySlot | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );
  const [details, setDetails] = useState<CustomerDetails>({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [detailErrors, setDetailErrors] = useState<
    Partial<Record<keyof CustomerDetails, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? null,
    [serviceId, services],
  );
  const eligibleBarbers = useMemo(
    () =>
      serviceId
        ? barbers.filter((barber) => barber.serviceIds.includes(serviceId))
        : [],
    [barbers, serviceId],
  );
  const selectedBarber =
    barberId === "any"
      ? null
      : barbers.find((barber) => barber.id === barberId) ?? null;

  const loadAvailability = useCallback(
    async (signal?: AbortSignal) => {
      if (!serviceId || !date) {
        return;
      }

      setIsLoadingSlots(true);
      setAvailabilityError(null);

      try {
        const searchParams = new URLSearchParams({
          serviceId,
          barberId,
          date,
        });
        const response = await fetch(`/api/availability?${searchParams}`, {
          cache: "no-store",
          signal,
        });
        const payload = (await response.json()) as {
          slots?: AvailabilitySlot[];
          error?: { message?: string };
        };

        if (!response.ok) {
          throw new Error(
            payload.error?.message ?? "Available times could not be loaded.",
          );
        }

        const nextSlots = payload.slots ?? [];
        setSlots(nextSlots);
        setSelectedSlot((current) =>
          current && nextSlots.some((slot) => slot.start === current.start)
            ? current
            : null,
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSlots([]);
        setSelectedSlot(null);
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "Available times could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoadingSlots(false);
        }
      }
    },
    [barberId, date, serviceId],
  );

  useEffect(() => {
    if (step !== 4 || !serviceId || !date) {
      return;
    }

    const controller = new AbortController();
    void loadAvailability(controller.signal);

    return () => controller.abort();
  }, [date, loadAvailability, serviceId, step]);

  function selectService(nextServiceId: string) {
    if (serviceId === nextServiceId) {
      return;
    }

    setServiceId(nextServiceId);
    setBarberId("any");
    setDate("");
    setSelectedSlot(null);
    setSlots([]);
    setSubmitError(null);
  }

  function selectBarber(nextBarberId: string) {
    setBarberId(nextBarberId);
    setSelectedSlot(null);
    setSlots([]);
    setSubmitError(null);
  }

  function selectDate(nextDate: string) {
    setDate(nextDate);
    setSelectedSlot(null);
    setSlots([]);
    setSubmitError(null);
  }

  function validateDetails() {
    const errors: Partial<Record<keyof CustomerDetails, string>> = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = details.phone.replace(/\D/g, "");

    if (details.name.trim().length < 2) {
      errors.name = "Enter your full name.";
    }
    if (!emailPattern.test(details.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      errors.phone = "Enter a phone number with 10 to 15 digits.";
    }
    if (details.notes.length > 500) {
      errors.notes = "Notes must be 500 characters or fewer.";
    }

    setDetailErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goForward() {
    if (step === 1 && !selectedService) {
      return;
    }
    if (step === 3 && !date) {
      return;
    }
    if (step === 4 && !selectedSlot) {
      return;
    }
    if (step === 5 && !validateDetails()) {
      return;
    }

    if (step < 6) {
      setStep((step + 1) as StepNumber);
      setSubmitError(null);
    }
  }

  function goBack() {
    if (step > 1) {
      setStep((step - 1) as StepNumber);
      setSubmitError(null);
    }
  }

  async function submitBooking() {
    if (!selectedService || !selectedSlot || !date || !validateDetails()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          barberId,
          date,
          startsAt: selectedSlot.start,
          customerName: details.name,
          customerEmail: details.email,
          customerPhone: details.phone,
          customerNotes: details.notes || undefined,
        }),
      });
      const payload = (await response.json()) as {
        checkoutUrl?: string;
        error?: { message?: string };
      };

      if (!response.ok || !payload.checkoutUrl) {
        if (response.status === 409) {
          setSelectedSlot(null);
          setStep(4);
          void loadAvailability();
        }

        throw new Error(
          payload.error?.message ?? "Your booking could not be saved.",
        );
      }

      window.location.assign(payload.checkoutUrl);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Your booking could not be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const copy = stepCopy[step];

  return (
    <div className="overflow-hidden border border-black/15 bg-[#f7f4ec] shadow-[0_25px_80px_rgba(0,0,0,0.12)]">
      <div className="grid lg:min-h-[720px] lg:grid-cols-[270px_1fr]">
        <aside className="bg-[#111] p-6 text-white sm:p-8 lg:p-9">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#c9a35d] uppercase">
            Booking progress
          </p>
          <ol className="mt-6 hidden space-y-1 lg:block">
            {steps.map((item) => {
              const isCurrent = item.number === step;
              const isComplete = item.number < step;

              return (
                <li key={item.number}>
                  <button
                    type="button"
                    disabled={!isComplete}
                    onClick={() => setStep(item.number)}
                    className={`flex w-full items-center gap-3 border-l py-3 pl-4 text-left transition-colors ${
                      isCurrent
                        ? "border-[#c9a35d] text-white"
                        : isComplete
                          ? "border-white/15 text-white/65 hover:text-[#d5ae67]"
                          : "border-white/10 text-white/28"
                    }`}
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                        isCurrent
                          ? "border-[#c9a35d] bg-[#c9a35d] text-black"
                          : isComplete
                            ? "border-[#c9a35d]/60 text-[#d5ae67]"
                            : "border-white/15"
                      }`}
                    >
                      {isComplete ? <Check className="size-3" /> : item.number}
                    </span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 grid grid-cols-6 gap-1.5 lg:hidden">
            {steps.map((item) => (
              <span
                key={item.number}
                className={`h-1 rounded-full ${
                  item.number <= step ? "bg-[#c9a35d]" : "bg-white/15"
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5 lg:mt-auto lg:pt-7">
            <div className="flex items-start gap-3 text-xs leading-5 text-white/45">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#c9a35d]" />
              <p>
                Times are verified again when you submit to prevent
                double-booking.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col p-5 sm:p-8 lg:p-12">
          <header className="border-b border-black/10 pb-7">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#9a7437] uppercase">
              {copy.eyebrow}
            </p>
            <h2 className="font-display mt-3 text-[clamp(2rem,4vw,3.6rem)] leading-[1] tracking-[-0.035em]">
              {copy.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/50">
              {copy.description}
            </p>
          </header>

          <div className="flex-1 py-7 sm:py-9">{renderStep()}</div>

          {submitError ? (
            <p
              role="alert"
              className="mb-5 border border-red-900/20 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {submitError}
            </p>
          ) : null}

          <footer className="flex items-center justify-between gap-4 border-t border-black/10 pt-5">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || isSubmitting}
              className="inline-flex h-11 items-center gap-2 px-1 text-xs font-bold tracking-[0.12em] text-black/50 uppercase transition-colors hover:text-black disabled:pointer-events-none disabled:opacity-0"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
            {step < 6 ? (
              <button
                type="button"
                onClick={goForward}
                disabled={
                  (step === 1 && !selectedService) ||
                  (step === 3 && !date) ||
                  (step === 4 && !selectedSlot)
                }
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#111] px-6 text-xs font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Continue
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void submitBooking()}
                disabled={isSubmitting}
                className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-full bg-[#c9a35d] px-6 text-xs font-bold tracking-[0.12em] text-black uppercase transition-colors hover:bg-[#dab66f] disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Opening checkout
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4" />
                    Continue to payment
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );

  function renderStep(): ReactNode {
    switch (step) {
      case 1:
        return (
          <div
            className="grid gap-3 md:grid-cols-2"
            role="radiogroup"
            aria-label="Choose a service"
          >
            {services.map((service) => {
              const isSelected = service.id === serviceId;

              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  key={service.id}
                  onClick={() => selectService(service.id)}
                  className={`group flex min-h-48 flex-col border p-5 text-left transition-all sm:p-6 ${
                    isSelected
                      ? "border-[#9a7437] bg-[#eee6d6] shadow-[inset_0_0_0_1px_#9a7437]"
                      : "border-black/12 bg-white/45 hover:border-black/30 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-9 items-center justify-center rounded-full border border-black/12 text-[#9a7437]">
                      <Scissors className="size-4" />
                    </span>
                    <span
                      className={`flex size-5 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-[#9a7437] bg-[#9a7437] text-white"
                          : "border-black/20 text-transparent"
                      }`}
                    >
                      <Check className="size-3" />
                    </span>
                  </div>
                  <p className="mt-5 text-[9px] font-bold tracking-[0.16em] text-[#9a7437] uppercase">
                    {service.category ?? "Barbering"}
                  </p>
                  <h3 className="font-display mt-2 text-xl">{service.name}</h3>
                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-black/45">
                    {service.description}
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-4 pt-5">
                    <span className="font-display text-xl">
                      {formatCurrency(service.priceCents, service.currency)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-black/45">
                      <Clock3 className="size-3.5 text-[#9a7437]" />
                      {formatDuration(service.durationMinutes)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 2:
        return (
          <div
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            role="radiogroup"
            aria-label="Choose a barber"
          >
            <ChoiceCard
              selected={barberId === "any"}
              onClick={() => selectBarber("any")}
              title="Any Available"
              subtitle="First open chair"
              icon={<UsersRound className="size-6" />}
            >
              The fastest option. We’ll assign an available barber when your
              booking is saved.
            </ChoiceCard>
            {eligibleBarbers.map((barber) => (
              <button
                type="button"
                role="radio"
                aria-checked={barber.id === barberId}
                key={barber.id}
                onClick={() => selectBarber(barber.id)}
                className={`group overflow-hidden border text-left transition-all ${
                  barber.id === barberId
                    ? "border-[#9a7437] bg-[#eee6d6] shadow-[inset_0_0_0_1px_#9a7437]"
                    : "border-black/12 bg-white/45 hover:border-black/30 hover:bg-white"
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#ddd6c8]">
                  <Image
                    src={barber.image ?? "/images/daniel-barber.png"}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 260px"
                    className="object-cover object-[center_30%] transition duration-500 group-hover:scale-[1.03]"
                  />
                  {barber.id === barberId ? (
                    <span className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-[#c9a35d] text-black">
                      <Check className="size-4" />
                    </span>
                  ) : null}
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl">{barber.name}</h3>
                  <p className="mt-1 text-[9px] font-bold tracking-[0.13em] text-[#9a7437] uppercase">
                    {barber.jobTitle ?? "Barber"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        );

      case 3:
        return (
          <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <label className="border border-black/12 bg-white p-5 sm:p-7">
              <span className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[#8b672e] uppercase">
                <CalendarDays className="size-4" />
                Appointment date
              </span>
              <input
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(event) => selectDate(event.target.value)}
                className="font-display mt-5 h-16 w-full border-0 border-b border-black/15 bg-transparent px-0 text-2xl outline-none focus:border-[#9a7437]"
              />
            </label>
            <div className="border border-black/12 bg-[#eee6d6] p-5 sm:p-7">
              <p className="text-[10px] font-bold tracking-[0.16em] text-[#8b672e] uppercase">
                Good to know
              </p>
              <ul className="mt-5 space-y-3 text-xs leading-5 text-black/55">
                <li className="flex gap-2.5">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[#8b672e]" />
                  Dates are shown in Eastern Time.
                </li>
                <li className="flex gap-2.5">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[#8b672e]" />
                  Booking opens up to {maxDate} based on the shop’s current
                  window.
                </li>
                <li className="flex gap-2.5">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[#8b672e]" />
                  A minimum of{" "}
                  {minimumLeadTimeMinutes >= 60
                    ? `${minimumLeadTimeMinutes / 60} hours`
                    : `${minimumLeadTimeMinutes} minutes`}{" "}
                  notice is required.
                </li>
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-black/45">
                {selectedService?.name} ·{" "}
                {selectedBarber?.name ?? "Any Available"}
              </p>
              <button
                type="button"
                onClick={() => void loadAvailability()}
                disabled={isLoadingSlots}
                className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.12em] text-[#8b672e] uppercase disabled:opacity-40"
              >
                <RefreshCw
                  className={`size-3.5 ${isLoadingSlots ? "animate-spin" : ""}`}
                />
                Refresh times
              </button>
            </div>

            <div aria-live="polite">
              {isLoadingSlots ? (
                <div className="flex min-h-52 items-center justify-center border border-black/10 bg-white/45">
                  <div className="text-center">
                    <LoaderCircle className="mx-auto size-6 animate-spin text-[#9a7437]" />
                    <p className="mt-3 text-xs text-black/45">
                      Checking every chair…
                    </p>
                  </div>
                </div>
              ) : availabilityError ? (
                <div className="border border-red-900/15 bg-red-50 p-6 text-center">
                  <p className="text-sm text-red-800">{availabilityError}</p>
                  <button
                    type="button"
                    onClick={() => void loadAvailability()}
                    className="mt-4 text-xs font-bold text-red-900 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : slots.length === 0 ? (
                <div className="border border-black/10 bg-white/45 p-8 text-center">
                  <Clock3 className="mx-auto size-6 text-[#9a7437]" />
                  <h3 className="font-display mt-4 text-xl">
                    No open times on this date.
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-black/45">
                    Go back and try another day or choose Any Available for the
                    widest selection.
                  </p>
                </div>
              ) : (
                <div
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4"
                  role="radiogroup"
                  aria-label="Choose an available time"
                >
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.start === slot.start;

                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        key={slot.start}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setSubmitError(null);
                        }}
                        className={`min-h-16 border px-3 py-3 text-center transition-all ${
                          isSelected
                            ? "border-[#9a7437] bg-[#9a7437] text-white"
                            : "border-black/12 bg-white/55 hover:border-[#9a7437] hover:bg-white"
                        }`}
                      >
                        <span className="block text-sm font-semibold">
                          {slot.label}
                        </span>
                        {barberId === "any" ? (
                          <span
                            className={`mt-1 block text-[9px] ${
                              isSelected ? "text-white/70" : "text-black/35"
                            }`}
                          >
                            {slot.barberIds.length}{" "}
                            {slot.barberIds.length === 1
                              ? "barber"
                              : "barbers"}{" "}
                            open
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Full name"
              icon={<UserRound className="size-3.5" />}
              error={detailErrors.name}
            >
              <input
                value={details.name}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                autoComplete="name"
                placeholder="Jordan Lee"
                className={inputClassName}
              />
            </Field>
            <Field
              label="Email address"
              icon={<Mail className="size-3.5" />}
              error={detailErrors.email}
            >
              <input
                type="email"
                value={details.email}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                autoComplete="email"
                placeholder="jordan@example.com"
                className={inputClassName}
              />
            </Field>
            <Field
              label="Phone number"
              icon={<Phone className="size-3.5" />}
              error={detailErrors.phone}
            >
              <input
                type="tel"
                value={details.phone}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                autoComplete="tel"
                placeholder="+1 (212) 555-0123"
                className={inputClassName}
              />
            </Field>
            <Field
              label="Notes for your barber (optional)"
              icon={<NotebookPen className="size-3.5" />}
              error={detailErrors.notes}
            >
              <input
                value={details.notes}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                maxLength={500}
                placeholder="Style preferences, accessibility needs…"
                className={inputClassName}
              />
            </Field>
          </div>
        );

      case 6:
        return selectedService && selectedSlot ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <div className="border border-black/12 bg-white p-5 sm:p-7">
              <p className="text-[10px] font-bold tracking-[0.16em] text-[#8b672e] uppercase">
                Appointment
              </p>
              <dl className="mt-5 divide-y divide-black/10">
                <SummaryRow label="Service" value={selectedService.name} />
                <SummaryRow
                  label="Barber"
                  value={selectedBarber?.name ?? "Any Available"}
                />
                <SummaryRow
                  label="When"
                  value={dateTimeFormatter.format(
                    new Date(selectedSlot.start),
                  )}
                />
                <SummaryRow
                  label="Duration"
                  value={formatDuration(selectedService.durationMinutes)}
                />
              </dl>
            </div>
            <div className="border border-black/12 bg-[#eee6d6] p-5 sm:p-7">
              <p className="text-[10px] font-bold tracking-[0.16em] text-[#8b672e] uppercase">
                Customer & payment
              </p>
              <div className="mt-5 space-y-2 text-sm">
                <p className="font-semibold">{details.name}</p>
                <p className="text-black/50">{details.email}</p>
                <p className="text-black/50">{details.phone}</p>
              </div>
              <div className="mt-7 border-t border-black/12 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-black/50">Service total</span>
                  <span className="font-display text-xl">
                    {formatCurrency(
                      selectedService.priceCents,
                      selectedService.currency,
                    )}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-black/50">
                    {selectedService.depositCents > 0 &&
                    selectedService.depositCents < selectedService.priceCents
                      ? "Deposit due now"
                      : "Full balance due now"}
                  </span>
                  <span className="text-sm font-semibold text-[#8b672e]">
                    {formatCurrency(
                      selectedService.depositCents > 0
                        ? selectedService.depositCents
                        : selectedService.priceCents,
                      selectedService.currency,
                    )}
                  </span>
                </div>
                <p className="mt-5 text-[11px] leading-5 text-black/42">
                  You’ll continue to Stripe’s secure hosted checkout. Your
                  appointment is confirmed only after payment succeeds.
                </p>
              </div>
            </div>
          </div>
        ) : null;
    }
  }
}

function ChoiceCard({
  selected,
  onClick,
  title,
  subtitle,
  icon,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex min-h-64 flex-col border p-5 text-left transition-all ${
        selected
          ? "border-[#9a7437] bg-[#eee6d6] shadow-[inset_0_0_0_1px_#9a7437]"
          : "border-black/12 bg-white/45 hover:border-black/30 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="flex size-12 items-center justify-center rounded-full bg-[#111] text-[#c9a35d]">
          {icon}
        </span>
        <span
          className={`flex size-6 items-center justify-center rounded-full border ${
            selected
              ? "border-[#9a7437] bg-[#9a7437] text-white"
              : "border-black/20 text-transparent"
          }`}
        >
          <Check className="size-3.5" />
        </span>
      </div>
      <h3 className="font-display mt-7 text-2xl">{title}</h3>
      <p className="mt-1 text-[9px] font-bold tracking-[0.13em] text-[#9a7437] uppercase">
        {subtitle}
      </p>
      <p className="mt-5 text-xs leading-5 text-black/48">{children}</p>
    </button>
  );
}

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[0.13em] text-black/55 uppercase">
        <span className="text-[#9a7437]">{icon}</span>
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-red-700">{error}</span>
      ) : null}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-5 py-4 first:pt-0">
      <dt className="text-xs text-black/45">{label}</dt>
      <dd className="max-w-[70%] text-right text-sm font-medium">{value}</dd>
    </div>
  );
}
