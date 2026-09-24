import { hash } from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

import { UserRole } from "@/generated/prisma/client";

import { authorizeOwnerCredentials } from "./authorize";

function createUserLookup(user: Record<string, unknown> | null) {
  return {
    findUnique: vi.fn().mockResolvedValue(user),
  };
}

describe("owner credential authorization", () => {
  it("accepts an active owner with a matching password hash", async () => {
    const passwordHash = await hash("Correct-Owner-Pass!", 12);
    const db = createUserLookup({
      id: "owner-1",
      name: "Daniel Brooks",
      email: "owner@crownandblade.example",
      image: null,
      passwordHash,
      role: UserRole.OWNER,
      isActive: true,
    });

    await expect(
      authorizeOwnerCredentials(
        {
          email: "  Owner@CrownAndBlade.example ",
          password: "Correct-Owner-Pass!",
        },
        db,
      ),
    ).resolves.toEqual({
      id: "owner-1",
      name: "Daniel Brooks",
      email: "owner@crownandblade.example",
      image: null,
      role: UserRole.OWNER,
    });
  });

  it("rejects barbers, inactive owners, and wrong passwords", async () => {
    const passwordHash = await hash("Correct-Owner-Pass!", 12);

    await expect(
      authorizeOwnerCredentials(
        {
          email: "marcus@crownandblade.example",
          password: "Correct-Owner-Pass!",
        },
        createUserLookup({
          id: "barber-1",
          name: "Marcus Reed",
          email: "marcus@crownandblade.example",
          image: null,
          passwordHash,
          role: UserRole.BARBER,
          isActive: true,
        }),
      ),
    ).resolves.toBeNull();

    await expect(
      authorizeOwnerCredentials(
        {
          email: "owner@crownandblade.example",
          password: "Correct-Owner-Pass!",
        },
        createUserLookup({
          id: "owner-1",
          name: "Daniel Brooks",
          email: "owner@crownandblade.example",
          image: null,
          passwordHash,
          role: UserRole.OWNER,
          isActive: false,
        }),
      ),
    ).resolves.toBeNull();

    await expect(
      authorizeOwnerCredentials(
        {
          email: "owner@crownandblade.example",
          password: "Wrong-Owner-Pass!",
        },
        createUserLookup({
          id: "owner-1",
          name: "Daniel Brooks",
          email: "owner@crownandblade.example",
          image: null,
          passwordHash,
          role: UserRole.OWNER,
          isActive: true,
        }),
      ),
    ).resolves.toBeNull();
  });

  it("rejects unknown accounts without leaking a different code path", async () => {
    await expect(
      authorizeOwnerCredentials(
        {
          email: "missing@example.com",
          password: "Any-Valid-Pass!",
        },
        createUserLookup(null),
      ),
    ).resolves.toBeNull();
  });
});
