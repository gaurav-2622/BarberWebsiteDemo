import { describe, expect, it } from "vitest";

import { GET, POST } from "./route";

describe("reminder cron route", () => {
  it("rejects requests without the configured secret", async () => {
    const previousSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "phase6-test-cron-secret";

    const response = await POST(
      new Request("http://localhost/api/cron/reminders", {
        method: "POST",
      }),
    );

    if (previousSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previousSecret;
    }

    const getResponse = await GET(
      new Request("http://localhost/api/cron/reminders"),
    );

    expect(response.status).toBe(401);
    expect(getResponse.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });
});
