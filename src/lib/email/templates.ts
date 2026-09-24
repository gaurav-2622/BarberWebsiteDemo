import { formatBookingDate, formatSlotTime } from "@/lib/booking/time";
import { formatCurrency } from "@/lib/formatters";

export type AppointmentEmailKind =
  | "booking_confirmation"
  | "deposit_paid"
  | "rescheduled"
  | "cancelled"
  | "reminder_24h"
  | "reminder_2h";

export type AppointmentEmailPayload = {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  barberName: string;
  startsAt: Date;
  previousStartsAt?: Date;
  priceCents: number;
  amountPaidCents: number;
  currency: string;
  manageUrl: string;
  businessName: string;
  phone: string;
  address: string;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

const copy: Record<
  AppointmentEmailKind,
  { subject: string; intro: string; headline: string }
> = {
  booking_confirmation: {
    subject: "Your chair is reserved",
    headline: "Booking confirmation",
    intro:
      "We reserved your appointment. Complete payment if you have not already, and keep this email for your visit.",
  },
  deposit_paid: {
    subject: "Deposit received — you’re confirmed",
    headline: "Deposit paid",
    intro:
      "Your payment was received and the appointment is confirmed. Any remaining balance is due at the shop.",
  },
  rescheduled: {
    subject: "Your appointment was rescheduled",
    headline: "Appointment updated",
    intro: "Your appointment time has been changed. The new details are below.",
  },
  cancelled: {
    subject: "Your appointment was cancelled",
    headline: "Appointment cancelled",
    intro:
      "This appointment is no longer on the books. Use the booking page if you would like a new time.",
  },
  reminder_24h: {
    subject: "Reminder: your appointment is tomorrow",
    headline: "24-hour reminder",
    intro: "This is a reminder that your appointment is coming up in about 24 hours.",
  },
  reminder_2h: {
    subject: "Reminder: your appointment is in 2 hours",
    headline: "2-hour reminder",
    intro: "Your appointment is about two hours away. We look forward to seeing you.",
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatWhen(date: Date) {
  return `${formatBookingDate(date)} at ${formatSlotTime(date)} ET`;
}

export function renderAppointmentEmail(
  kind: AppointmentEmailKind,
  payload: AppointmentEmailPayload,
): RenderedEmail {
  const content = copy[kind];
  const remainingCents = Math.max(
    payload.priceCents - payload.amountPaidCents,
    0,
  );
  const subject = `${content.subject} · ${payload.confirmationCode}`;
  const rows = [
    ["Confirmation", payload.confirmationCode],
    ["Service", payload.serviceName],
    ["Barber", payload.barberName],
    ["When", formatWhen(payload.startsAt)],
    ...(payload.previousStartsAt
      ? [["Previously", formatWhen(payload.previousStartsAt)]]
      : []),
    ["Paid", formatCurrency(payload.amountPaidCents, payload.currency)],
    [
      "Remaining balance",
      formatCurrency(remainingCents, payload.currency),
    ],
  ];
  const text = [
    `${payload.businessName}`,
    content.headline,
    "",
    `Hi ${payload.customerName},`,
    content.intro,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    kind === "cancelled"
      ? `Book again or call ${payload.phone}.`
      : `Manage your appointment: ${payload.manageUrl}`,
    `${payload.address}`,
    payload.phone,
  ].join("\n");

  const details = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #ece6d8;color:#8b672e;font-size:11px;letter-spacing:.12em;text-transform:uppercase;width:38%">${escapeHtml(label)}</td><td style="padding:10px 0;border-bottom:1px solid #ece6d8;color:#111;font-size:15px">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const action =
    kind === "cancelled"
      ? ""
      : `<p style="margin:28px 0 0"><a href="${escapeHtml(payload.manageUrl)}" style="display:inline-block;background:#c9a35d;color:#111;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Manage booking</a></p>`;
  const html = `<!doctype html>
<html><body style="margin:0;background:#0b0b0b;font-family:Georgia,Times,serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0b0b;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#f7f4ec;color:#111">
        <tr><td style="background:#111;padding:28px 32px;color:#f7f3ea">
          <p style="margin:0;color:#c9a35d;font-size:11px;letter-spacing:.18em;text-transform:uppercase">${escapeHtml(payload.businessName)}</p>
          <h1 style="margin:12px 0 0;font-size:32px;line-height:1.1">${escapeHtml(content.headline)}</h1>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;font-size:16px">Hi ${escapeHtml(payload.customerName)},</p>
          <p style="margin:0 0 24px;color:#4a453c;line-height:1.6">${escapeHtml(content.intro)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${details}</table>
          ${action}
          <p style="margin:28px 0 0;color:#6b6458;font-size:13px;line-height:1.6">${escapeHtml(payload.address)}<br>${escapeHtml(payload.phone)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}
