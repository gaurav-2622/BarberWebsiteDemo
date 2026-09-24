import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  ensureAdminAccount,
  parseAdminEnvironment,
} from "../src/lib/admin/ensure-admin";

async function main() {
  const parsedEnvironment = parseAdminEnvironment(process.env);

  if (!parsedEnvironment.success) {
    throw new Error(
      parsedEnvironment.error.issues[0]?.message ??
        "ADMIN_EMAIL and ADMIN_PASSWORD must be set to create the owner account.",
    );
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed the admin account.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const admin = await ensureAdminAccount(prisma, parsedEnvironment.data);
    console.info(`Admin account is ready for ${admin.email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
