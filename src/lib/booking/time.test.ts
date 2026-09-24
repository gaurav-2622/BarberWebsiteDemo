import { describe, expect, it } from "vitest";

import {
  fromShopTime,
  getShopDateKey,
  getShopDayBounds,
  isDateWithinBookingWindow,
  isValidDateKey,
  rangesOverlap,
  shiftDateKey,
} from "./time";

describe("booking date helpers", () => {
  it("validates calendar date keys", () => {
    expect(isValidDateKey("2028-02-29")).toBe(true);
    expect(isValidDateKey("2027-02-29")).toBe(false);
    expect(isValidDateKey("2026-13-01")).toBe(false);
    expect(isValidDateKey("09/24/2026")).toBe(false);
  });

  it("shifts date keys without depending on the host timezone", () => {
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("uses the New York calendar date at UTC boundaries", () => {
    const instant = new Date("2026-09-24T03:30:00.000Z");

    expect(getShopDateKey(instant)).toBe("2026-09-23");
    expect(isDateWithinBookingWindow("2026-09-23", 2, instant)).toBe(true);
    expect(isDateWithinBookingWindow("2026-09-25", 2, instant)).toBe(true);
    expect(isDateWithinBookingWindow("2026-09-26", 2, instant)).toBe(false);
  });
});

describe("New York time conversion", () => {
  it("applies standard and daylight-saving offsets", () => {
    expect(fromShopTime("2026-01-15", 9 * 60).toISOString()).toBe(
      "2026-01-15T14:00:00.000Z",
    );
    expect(fromShopTime("2026-07-15", 9 * 60).toISOString()).toBe(
      "2026-07-15T13:00:00.000Z",
    );
  });

  it("builds 23-hour and 25-hour bounds on DST transition days", () => {
    const springForward = getShopDayBounds("2026-03-08");
    const fallBack = getShopDayBounds("2026-11-01");

    expect(
      springForward.endsAt.getTime() - springForward.startsAt.getTime(),
    ).toBe(23 * 60 * 60 * 1000);
    expect(fallBack.endsAt.getTime() - fallBack.startsAt.getTime()).toBe(
      25 * 60 * 60 * 1000,
    );
  });
});

describe("appointment overlap detection", () => {
  const ten = new Date("2026-09-24T14:00:00.000Z");
  const eleven = new Date("2026-09-24T15:00:00.000Z");

  it("allows appointments that only touch at an endpoint", () => {
    expect(
      rangesOverlap(
        ten,
        eleven,
        eleven,
        new Date("2026-09-24T16:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("detects any positive overlap", () => {
    expect(
      rangesOverlap(
        ten,
        eleven,
        new Date("2026-09-24T14:59:00.000Z"),
        new Date("2026-09-24T16:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
