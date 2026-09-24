import { describe, expect, it } from "vitest";

import { consumeRateLimit, getRequestIp } from "./rate-limit";

describe("in-memory rate limiting", () => {
  it("allows requests until the max is reached", () => {
    const key = `test:${Date.now()}`;
    const now = Date.now();

    expect(consumeRateLimit(key, { windowMs: 60_000, max: 2 }, now).ok).toBe(
      true,
    );
    expect(
      consumeRateLimit(key, { windowMs: 60_000, max: 2 }, now + 10).ok,
    ).toBe(true);
    expect(
      consumeRateLimit(key, { windowMs: 60_000, max: 2 }, now + 20),
    ).toEqual({
      ok: false,
      retryAfterSeconds: 60,
    });
  });

  it("reads the first forwarded IP", () => {
    const request = new Request("http://localhost/api/appointments", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      },
    });

    expect(getRequestIp(request)).toBe("203.0.113.10");
  });
});
