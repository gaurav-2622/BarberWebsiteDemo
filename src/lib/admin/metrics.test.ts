import { describe, expect, it } from "vitest";

import { PaymentStatus } from "@/generated/prisma/client";

import { isCompletedPayment, sumOutstandingBalance } from "./metrics";

describe("admin metrics", () => {
  it("sums remaining balances without going negative", () => {
    expect(
      sumOutstandingBalance([
        { priceCents: 4500, amountPaidCents: 1000 },
        { priceCents: 3000, amountPaidCents: 3000 },
        { priceCents: 4000, amountPaidCents: 5000 },
      ]),
    ).toBe(3500);
  });

  it("treats only paid payment status as completed revenue", () => {
    expect(isCompletedPayment(PaymentStatus.PAID)).toBe(true);
    expect(isCompletedPayment(PaymentStatus.PENDING)).toBe(false);
  });
});
