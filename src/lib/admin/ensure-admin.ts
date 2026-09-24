import { hash } from "bcryptjs";
import { z } from "zod";

import { UserRole, type PrismaClient } from "@/generated/prisma/client";

export const adminEnvironmentSchema = z.object({
  ADMIN_EMAIL: z.string().trim().toLowerCase().email(),
  ADMIN_PASSWORD: z
    .string()
    .min(12, "ADMIN_PASSWORD must contain at least 12 characters.")
    .max(128, "ADMIN_PASSWORD must contain at most 128 characters."),
});

export function parseAdminEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return adminEnvironmentSchema.safeParse({
    ADMIN_EMAIL: environment.ADMIN_EMAIL,
    ADMIN_PASSWORD: environment.ADMIN_PASSWORD,
  });
}

export async function ensureAdminAccount(
  db: Pick<PrismaClient, "user">,
  input: z.infer<typeof adminEnvironmentSchema>,
) {
  const passwordHash = await hash(input.ADMIN_PASSWORD, 12);

  return db.user.upsert({
    where: { email: input.ADMIN_EMAIL },
    update: {
      passwordHash,
      role: UserRole.OWNER,
      isActive: true,
    },
    create: {
      name: "Shop Owner",
      email: input.ADMIN_EMAIL,
      passwordHash,
      role: UserRole.OWNER,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
    },
  });
}
