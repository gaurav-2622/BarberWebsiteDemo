import "dotenv/config";

import { defineConfig, env } from "prisma/config";

import { resolvePrismaConfigUrl } from "./src/lib/database-url";

resolvePrismaConfigUrl();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
