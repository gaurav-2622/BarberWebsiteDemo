import "dotenv/config";

import { defineConfig, env } from "prisma/config";

const GENERATE_PLACEHOLDER_URL =
  "postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public";

const resolved = [
  "DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
  "DIRECT_URL",
  "POSTGRES_URL",
]
  .map((name) => process.env[name]?.trim())
  .find(Boolean);

process.env.DATABASE_URL = resolved ?? GENERATE_PLACEHOLDER_URL;

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
