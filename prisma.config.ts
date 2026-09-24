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

if (resolved) {
  process.env.DATABASE_URL = resolved;
} else {
  const isGenerateOnly =
    process.env.npm_lifecycle_event === "postinstall" ||
    process.argv.includes("generate");

  if (process.env.VERCEL && !isGenerateOnly) {
    throw new Error(
      "DATABASE_URL is empty. Add DATABASE_URL in Vercel → Settings → Environment Variables, or attach Vercel Postgres so POSTGRES_URL is set.",
    );
  }

  process.env.DATABASE_URL = GENERATE_PLACEHOLDER_URL;
}

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
