import { describe, expect, it } from "vitest";

import {
  AppointmentStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import { getAppointmentUpdate } from "./appointment-updates";

describe("owner appointment updates", () => {
  const now = new Date("2026-09-25T14:00:00.000Z");

  it("marks appointments completed or cancelled", () => {
    expect(
      getAppointmentUpdate(
        {
          status: AppointmentStatus.CONFIRMED,
          priceCents: 4500,
          internalNotes: null,
        },
        "complete",
        now,
      ),
    ).toEqual({
      status: AppointmentStatus.COMPLETED,
    });

    expect(
      getAppointmentUpdate(
        {
          status: AppointmentStatus.CONFIRMED,
          priceCents: 4500,
          internalNotes: null,
        },
        "cancel",
        now,
      ),
    ).toEqual({
      status: AppointmentStatus.CANCELLED,
      cancellationReason: "Cancelled by owner.",
      cancelledAt: now,
    });
  });

  it("records a paid-in-person settlement against the full price", () => {
    expect(
      getAppointmentUpdate(
        {
          status: AppointmentStatus.COMPLETED,
          priceCents: 7000,
          internalNotes: "Walk-in guest.",
        },
        "paid_in_person",
        now,
      ),
    ).toEqual({
      status: AppointmentStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      amountPaidCents: 7000,
      internalNotes:
        "Walk-in guest.\nPaid in person and recorded by owner.",
      cancellationReason: null,
      cancelledAt: null,
    });
  });
});
