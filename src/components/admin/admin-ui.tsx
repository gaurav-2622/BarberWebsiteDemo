import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#8b672e] uppercase">
          {eyebrow}
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-[-0.035em] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/50">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}

export function AdminPanel({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border border-black/12 bg-[#f8f5ed] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 px-5 py-4 sm:px-6">
        <div>
          {eyebrow ? (
            <p className="text-[9px] font-bold tracking-[0.16em] text-[#8b672e] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-display mt-1 text-xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export const adminInputClassName =
  "h-11 w-full border border-black/15 bg-white px-3.5 text-sm text-[#111] outline-none transition-colors placeholder:text-black/30 focus:border-[#9a7437] focus:ring-2 focus:ring-[#c9a35d]/15 disabled:cursor-not-allowed disabled:bg-black/5";

export const adminTextareaClassName =
  "min-h-28 w-full resize-y border border-black/15 bg-white px-3.5 py-3 text-sm text-[#111] outline-none transition-colors placeholder:text-black/30 focus:border-[#9a7437] focus:ring-2 focus:ring-[#c9a35d]/15";

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-bold tracking-[0.14em] text-black/55 uppercase">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-[10px] leading-4 text-black/40">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function SubmitButton({
  children,
  tone = "dark",
}: {
  children: ReactNode;
  tone?: "dark" | "danger" | "gold";
}) {
  const tones = {
    dark: "bg-[#111] text-white hover:bg-[#292929]",
    danger: "bg-red-900 text-white hover:bg-red-800",
    gold: "bg-[#c9a35d] text-black hover:bg-[#ddb96f]",
  };

  return (
    <button
      type="submit"
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[10px] font-bold tracking-[0.12em] uppercase transition-colors ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
