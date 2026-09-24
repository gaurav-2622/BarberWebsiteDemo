import { compare } from "bcryptjs";
import { z } from "zod";

import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const dummyPasswordHash =
  "$2b$12$tTJkHQxowoTIe2t/Atytb.43mhhngUzEIUO2GK0AHVZlT4XuSoOzu";

type OwnerLookup = {
  findUnique: typeof prisma.user.findUnique;
};

export async function authorizeOwnerCredentials(
  credentials: unknown,
  db: OwnerLookup = prisma.user,
) {
  const parsedCredentials = credentialsSchema.safeParse(credentials);

  if (!parsedCredentials.success) {
    return null;
  }

  const user = await db.findUnique({
    where: {
      email: parsedCredentials.data.email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      passwordHash: true,
      role: true,
      isActive: true,
    },
  });

  const passwordMatches = await compare(
    parsedCredentials.data.password,
    user?.passwordHash ?? dummyPasswordHash,
  );

  if (
    !user?.passwordHash ||
    !user.isActive ||
    user.role !== UserRole.OWNER ||
    !passwordMatches
  ) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
  };
}
