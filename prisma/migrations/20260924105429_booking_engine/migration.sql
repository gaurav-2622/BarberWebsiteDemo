-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "service_buffer_minutes" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';

-- AddCheckConstraint
ALTER TABLE "appointments"
    ADD CONSTRAINT "appointments_service_buffer_minutes_check" CHECK ("service_buffer_minutes" >= 0);
