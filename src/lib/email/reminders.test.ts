import { describe, expect, it } from "vitest";

import { getReminderWindows, isAuthorizedCronRequest } from "./reminders";

describe("reminder authorization", () => {
  it("accepts only the exact configured secret", () => {
    const secret = "phase6-cron-secret-value";

    expect(isAuthorizedCronRequest(secret, secret)).toBe(true);
    expect(isAuthorizedCronRequest("wrong-secret-value!!!!!", secret)).toBe(
      false,
    );
    expect(isAuthorizedCronRequest(secret, "replace_me")).toBe(false);
    expect(isAuthorizedCronRequest(null, secret)).toBe(false);
  });
});

describe("reminder windows", () => {
  it("builds 24-hour and 2-hour cutoff times from now", () => {
    const now = new Date("2026-09-25T12:00:00.000Z");
    const windows = getReminderWindows(now);

    expect(windows.secondReminderEndsAt.toISOString()).toBe(
      "2026-09-25T14:00:00.000Z",
    );
    expect(windows.firstReminderEndsAt.toISOString()).toBe(
      "2026-09-26T12:00:00.000Z",
    );
  });
});
