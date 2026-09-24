-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'BARBER', 'OWNER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEBSITE', 'ADMIN', 'PHONE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMPTZ(3),
    "image" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "slug" TEXT,
    "job_title" TEXT,
    "bio" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("provider","provider_account_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "authenticators" (
    "credential_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "credential_public_key" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credential_device_type" TEXT NOT NULL,
    "credential_backed_up" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "authenticators_pkey" PRIMARY KEY ("user_id","credential_id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "buffer_minutes" INTEGER NOT NULL DEFAULT 0,
    "price_cents" INTEGER NOT NULL,
    "deposit_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barber_services" (
    "barber_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "custom_price_cents" INTEGER,
    "custom_duration_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "barber_services_pkey" PRIMARY KEY ("barber_id","service_id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "confirmation_code" TEXT NOT NULL,
    "customer_id" UUID,
    "barber_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "service_duration_minutes" INTEGER NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "time_zone" TEXT NOT NULL DEFAULT 'America/New_York',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "booking_source" "BookingSource" NOT NULL DEFAULT 'WEBSITE',
    "price_cents" INTEGER NOT NULL,
    "deposit_cents" INTEGER NOT NULL DEFAULT 0,
    "amount_paid_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripe_checkout_session_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "customer_notes" TEXT,
    "internal_notes" TEXT,
    "cancellation_reason" TEXT,
    "cancelled_at" TIMESTAMPTZ(3),
    "reminder_sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "business_name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "time_zone" TEXT NOT NULL DEFAULT 'America/New_York',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "booking_window_days" INTEGER NOT NULL DEFAULT 60,
    "minimum_lead_time_minutes" INTEGER NOT NULL DEFAULT 120,
    "cancellation_window_hours" INTEGER NOT NULL DEFAULT 24,
    "slot_interval_minutes" INTEGER NOT NULL DEFAULT 15,
    "default_deposit_cents" INTEGER NOT NULL DEFAULT 0,
    "booking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "online_payments_enabled" BOOLEAN NOT NULL DEFAULT false,
    "confirmation_email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_lead_hours" INTEGER NOT NULL DEFAULT 24,
    "instagram_url" TEXT,
    "facebook_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_hours" (
    "id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_times" (
    "id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "blocked_times_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_slug_key" ON "users"("slug");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "authenticators_credential_id_key" ON "authenticators"("credential_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_is_active_sort_order_idx" ON "services"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "barber_services_service_id_is_active_idx" ON "barber_services"("service_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_confirmation_code_key" ON "appointments"("confirmation_code");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_stripe_checkout_session_id_key" ON "appointments"("stripe_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_stripe_payment_intent_id_key" ON "appointments"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "appointments_barber_id_starts_at_ends_at_idx" ON "appointments"("barber_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "appointments_status_starts_at_idx" ON "appointments"("status", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_customer_id_starts_at_idx" ON "appointments"("customer_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_customer_email_starts_at_idx" ON "appointments"("customer_email", "starts_at");

-- CreateIndex
CREATE INDEX "working_hours_day_of_week_is_active_idx" ON "working_hours"("day_of_week", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "working_hours_barber_id_day_of_week_key" ON "working_hours"("barber_id", "day_of_week");

-- CreateIndex
CREATE INDEX "blocked_times_barber_id_starts_at_ends_at_idx" ON "blocked_times"("barber_id", "starts_at", "ends_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authenticators" ADD CONSTRAINT "authenticators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "services"
    ADD CONSTRAINT "services_duration_minutes_check" CHECK ("duration_minutes" > 0),
    ADD CONSTRAINT "services_buffer_minutes_check" CHECK ("buffer_minutes" >= 0),
    ADD CONSTRAINT "services_price_cents_check" CHECK ("price_cents" >= 0),
    ADD CONSTRAINT "services_deposit_cents_check" CHECK ("deposit_cents" >= 0 AND "deposit_cents" <= "price_cents");

ALTER TABLE "barber_services"
    ADD CONSTRAINT "barber_services_custom_price_cents_check" CHECK ("custom_price_cents" IS NULL OR "custom_price_cents" >= 0),
    ADD CONSTRAINT "barber_services_custom_duration_minutes_check" CHECK ("custom_duration_minutes" IS NULL OR "custom_duration_minutes" > 0);

ALTER TABLE "appointments"
    ADD CONSTRAINT "appointments_time_range_check" CHECK ("ends_at" > "starts_at"),
    ADD CONSTRAINT "appointments_service_duration_minutes_check" CHECK ("service_duration_minutes" > 0),
    ADD CONSTRAINT "appointments_price_cents_check" CHECK ("price_cents" >= 0),
    ADD CONSTRAINT "appointments_deposit_cents_check" CHECK ("deposit_cents" >= 0 AND "deposit_cents" <= "price_cents"),
    ADD CONSTRAINT "appointments_amount_paid_cents_check" CHECK ("amount_paid_cents" >= 0);

ALTER TABLE "shop_settings"
    ADD CONSTRAINT "shop_settings_booking_window_days_check" CHECK ("booking_window_days" > 0),
    ADD CONSTRAINT "shop_settings_minimum_lead_time_minutes_check" CHECK ("minimum_lead_time_minutes" >= 0),
    ADD CONSTRAINT "shop_settings_cancellation_window_hours_check" CHECK ("cancellation_window_hours" >= 0),
    ADD CONSTRAINT "shop_settings_slot_interval_minutes_check" CHECK ("slot_interval_minutes" > 0),
    ADD CONSTRAINT "shop_settings_default_deposit_cents_check" CHECK ("default_deposit_cents" >= 0),
    ADD CONSTRAINT "shop_settings_reminder_lead_hours_check" CHECK ("reminder_lead_hours" >= 0);

ALTER TABLE "working_hours"
    ADD CONSTRAINT "working_hours_day_of_week_check" CHECK ("day_of_week" BETWEEN 0 AND 6),
    ADD CONSTRAINT "working_hours_start_minute_check" CHECK ("start_minute" BETWEEN 0 AND 1439),
    ADD CONSTRAINT "working_hours_end_minute_check" CHECK ("end_minute" BETWEEN 1 AND 1440),
    ADD CONSTRAINT "working_hours_range_check" CHECK ("end_minute" > "start_minute");

ALTER TABLE "blocked_times"
    ADD CONSTRAINT "blocked_times_range_check" CHECK ("ends_at" > "starts_at");
