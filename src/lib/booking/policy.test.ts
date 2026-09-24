import { AppointmentStatus } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";

import {
  canCustomerChangeAppointment,
  isCustomerManageableStatus,
} from "./policy";

describe("customer change policy", () => {
  it("allows changes outside the configured lead window", () => {
    const startsAt = new Date("2026-09-26T18:00:00.000Z");
    const now = new Date("2026-09-25T17:00:00.000Z");

    expect(canCustomerChangeAppointment(startsAt, 24, now)).toBe(true);
    expect(canCustomerChangeAppointment(startsAt, 24, new Date("2026-09-25T18:30:00.000Z"))).toBe(
      false,
    );
  });

  it("only treats pending and confirmed appointments as customer-manageable", () => {
    expect(isCustomerManageableStatus(AppointmentStatus.CONFIRMED)).toBe(true);
    expect(isCustomerManageableStatus(AppointmentStatus.PENDING_PAYMENT)).toBe(
      false,
    );
    expect(isCustomerManageableStatus(AppointmentStatus.CANCELLED)).toBe(false);
  });
});
