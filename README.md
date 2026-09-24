# Barbershop Booking Platform

Premium, mobile-first website and booking management system for Crown & Blade
Barbershop. Customers can book and manage appointments online. The owner can
manage services, barbers, schedules, payments, and shop settings.

## Stack

- Next.js 15 App Router with TypeScript
- Tailwind CSS 4 and shadcn/ui
- PostgreSQL 16
- Prisma ORM 7
- Stripe Checkout and signed webhooks
- Auth.js v5 with Prisma adapter for the owner dashboard
- Resend for transactional email

## Local installation

1. Copy `.env.example` to `.env` and fill in the values described below.
2. Start PostgreSQL:

   ```bash
   npm run db:start
   ```

3. Apply database migrations and load mock data:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Start the application:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

For a production-like run after `npm run build`, use `npm start`.

## Environment variables

### Application and database

- `DATABASE_URL` — PostgreSQL connection string
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` — local Docker database
- `NEXT_PUBLIC_APP_URL` — absolute public site URL, for example `http://localhost:3000`

### Auth.js and owner account

- `AUTH_SECRET` — random secret used to sign Auth.js sessions
- `ADMIN_EMAIL` — initial owner login email
- `ADMIN_PASSWORD` — initial owner password, at least 12 characters

Never commit the owner password. Seed scripts hash it with bcrypt before
saving.

### Stripe

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe test publishable key
- `STRIPE_SECRET_KEY` — Stripe test secret key
- `STRIPE_WEBHOOK_SECRET` — webhook signing secret from Stripe CLI or the Dashboard

### Resend and reminders

- `RESEND_API_KEY` — Resend API key
- `RESEND_FROM_EMAIL` — verified from address, for example `Crown & Blade Barbershop <bookings@example.com>`
- `CRON_SECRET` — shared secret that protects `POST /api/cron/reminders`

If `RESEND_API_KEY` is missing, booking still works and emails are skipped.

## Owner dashboard

```bash
npm run db:seed:admin
```

`npm run db:seed` also creates or updates the owner login when `ADMIN_EMAIL`
and `ADMIN_PASSWORD` are present. Sign in at
[http://localhost:3000/admin/login](http://localhost:3000/admin/login).

The dashboard includes Overview, Appointments, Services, Barbers, and
Settings. Unauthenticated visitors are redirected to the login page.

## Customer booking management

Every appointment receives an unpredictable management token. Confirmation and
reminder emails include a private link:

`/booking/manage/[token]`

From that page a customer can view details, remaining balance, and cancel or
reschedule when the appointment is still outside the shop’s configured change
window.

## Stripe test setup

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`. Appointments
are confirmed only after the signed `checkout.session.completed` webhook
reports a successful payment.

## Email and reminders

Resend sends booking confirmation, deposit paid, reschedule, cancellation, and
reminder messages. Schedule a trusted caller against the reminder endpoint
every 10–15 minutes:

```bash
curl -X POST http://localhost:3000/api/cron/reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

The endpoint sends 24-hour and 2-hour reminders for upcoming pending or
confirmed appointments and records those sends so they are not repeated.

## Database commands

```bash
npm run db:generate       # Generate Prisma Client
npm run db:migrate        # Create/apply a development migration
npm run db:migrate:deploy # Apply committed migrations
npm run db:seed           # Load repeatable mock data
npm run db:seed:admin     # Create/update the hashed owner login
npm run db:studio         # Open Prisma Studio
npm run db:stop           # Stop local PostgreSQL
```

Money is stored as integer cents. Appointment timestamps are stored as
timezone-aware PostgreSQL values, with the shop timezone kept separately for
display and availability calculations.

## Verification

```bash
npm test
npm run lint
npm run typecheck
```
