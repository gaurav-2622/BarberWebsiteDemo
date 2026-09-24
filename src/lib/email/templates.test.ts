import { describe, expect, it } from "vitest";

import { renderAppointmentEmail } from "./templates";

const payload = {
  customerName: "Jordan Lee",
  confirmationCode: "CB-DEMO-001",
  serviceName: "Signature Haircut",
  barberName: "Daniel Brooks",
  startsAt: new Date("2026-09-26T14:00:00.000Z"),
  previousStartsAt: new Date("2026-09-26T13:00:00.000Z"),
  priceCents: 4500,
  amountPaidCents: 1000,
  currency: "USD",
  manageUrl: "http://localhost:3000/booking/manage/test-token",
  businessName: "Crown & Blade Barbershop",
  phone: "+1-212-555-0147",
  address: "125 Mercer Street, New York, NY 10012",
};

describe("appointment email templates", () => {
  it("renders confirmation, payment, reschedule, and cancellation copy", () => {
    const confirmation = renderAppointmentEmail("booking_confirmation", payload);
    const paid = renderAppointmentEmail("deposit_paid", payload);
    const rescheduled = renderAppointmentEmail("rescheduled", payload);
    const cancelled = renderAppointmentEmail("cancelled", payload);

    expect(confirmation.subject).toContain("CB-DEMO-001");
    expect(confirmation.html).toContain("Manage booking");
    expect(paid.text.toLowerCase()).toContain("confirmed");
    expect(rescheduled.text).toContain("Previously");
    expect(cancelled.html).not.toContain("Manage booking");
  });

  it("renders 24-hour and 2-hour reminder subjects", () => {
    const first = renderAppointmentEmail("reminder_24h", payload);
    const second = renderAppointmentEmail("reminder_2h", payload);

    expect(first.subject).toContain("tomorrow");
    expect(second.subject).toContain("2 hours");
    expect(first.html).toContain("Jordan Lee");
  });
});
