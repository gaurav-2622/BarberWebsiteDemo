-- AlterTable
ALTER TABLE "appointments"
ADD COLUMN "management_token" TEXT,
ADD COLUMN "reminder_24h_sent_at" TIMESTAMPTZ(3),
ADD COLUMN "reminder_2h_sent_at" TIMESTAMPTZ(3);

UPDATE "appointments"
SET "management_token" = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE "management_token" IS NULL;

ALTER TABLE "appointments"
ALTER COLUMN "management_token" SET NOT NULL;

CREATE UNIQUE INDEX "appointments_management_token_key" ON "appointments"("management_token");
CREATE INDEX "appointments_status_starts_at_reminder_24h_sent_at_idx" ON "appointments"("status", "starts_at", "reminder_24h_sent_at");
CREATE INDEX "appointments_status_starts_at_reminder_2h_sent_at_idx" ON "appointments"("status", "starts_at", "reminder_2h_sent_at");
