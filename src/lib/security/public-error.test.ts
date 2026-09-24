import { describe, expect, it } from "vitest";

import { getPublicErrorMessage } from "./public-error";

describe("public error messages", () => {
  it("hides internal details in production", () => {
    expect(
      getPublicErrorMessage(
        new Error("relation appointments does not exist"),
        "Try again.",
        "production",
      ),
    ).toBe("Try again.");
  });

  it("keeps developer messages outside production", () => {
    expect(
      getPublicErrorMessage(
        new Error("relation appointments does not exist"),
        "Try again.",
        "test",
      ),
    ).toBe("relation appointments does not exist");
  });
});
