# Vercel deployment

Use this checklist when connecting the Crown & Blade app to a Vercel project.
Add every production value in **Project → Settings → Environment Variables**
for the Production environment (and Preview if you want those deploys to work).

## Build

Vercel runs `npm install`, then `npm run build`.

- `postinstall` runs `prisma generate` so the Prisma Client exists after install.
- `build` runs `prisma generate && prisma migrate deploy && next build` so pending
  PostgreSQL migrations are applied before Next.js compiles.

`DATABASE_URL` must be available at build time, or `prisma migrate deploy` will
fail.

## Environment variables

### Database

| Name | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Production PostgreSQL connection string. Use the pooled or direct URL your host provides. Prisma reads this during `migrate deploy` and at runtime. |

Local Docker variables (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`POSTGRES_PORT`) are not needed on Vercel.

### Application URL

| Name | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Yes | Public site origin, for example `https://your-project.vercel.app` or the custom domain. Used for Stripe return URLs, email manage links, metadata, and sitemap. No trailing slash. |

### Auth.js (NextAuth v5)

| Name | Required | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | Yes | Long random secret used to sign owner sessions. Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | Recommended | Canonical auth URL, for example `https://your-domain.com`. Auth.js also accepts this as `NEXTAUTH_URL`. The app sets `trustHost: true`, but setting `AUTH_URL` avoids callback mismatches. |
| `ADMIN_EMAIL` | First deploy only | Used by `npm run db:seed:admin` (or `npm run db:seed`) to create the owner login. Not required at runtime after the owner exists. |
| `ADMIN_PASSWORD` | First deploy only | At least 12 characters. Never hardcode it. Seed scripts hash it with bcrypt before saving. |

Create the owner once against the production database (from your machine with
`DATABASE_URL` pointed at production, or a one-off Vercel/CLI job). Do not leave
a production password in git.

### Stripe (live mode for production)

| Name | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Live publishable key (`pk_live_...`). Use `pk_test_...` only on Preview if you want test checkout there. |
| `STRIPE_SECRET_KEY` | Yes | Live secret key (`sk_live_...`). |
| `STRIPE_WEBHOOK_SECRET` | Yes | Signing secret (`whsec_...`) from the Stripe webhook endpoint that points at `https://your-domain.com/api/webhooks/stripe`. |

In the Stripe Dashboard, add a webhook for `checkout.session.completed` and
`checkout.session.expired`. After the first production deploy, copy the
endpoint signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy if needed.

### Resend

| Name | Required | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | Yes for email | Resend API key. If missing, bookings still succeed and emails are skipped. |
| `RESEND_FROM_EMAIL` | Recommended | Verified from address, for example `Crown & Blade Barbershop <bookings@your-domain.com>`. |

Verify the sending domain in Resend before relying on production mail.

### Cron / reminders

| Name | Required | Notes |
| --- | --- | --- |
| `CRON_SECRET` | Yes | Long random secret that authorizes `GET`/`POST` `/api/cron/reminders`. |

## Securing Vercel Cron with `CRON_SECRET`

`vercel.json` schedules an hourly GET to `/api/cron/reminders`:

```json
{
  "crons": [{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }]
}
```

1. Generate a long random value, for example `openssl rand -base64 32`.
2. Add it in Vercel as `CRON_SECRET` (Production).
3. Vercel Cron automatically sends  
   `Authorization: Bearer <CRON_SECRET>`  
   on each scheduled request.
4. The route compares that bearer token to `CRON_SECRET` with a timing-safe
   check. Requests without the matching secret receive HTTP 401.

You can also call the endpoint manually:

```bash
curl -X GET "https://your-domain.com/api/cron/reminders" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Hobby plans only allow a daily cron. Hourly schedules require a Pro plan (or
call the same secured URL from an external scheduler).

## After the first deploy

1. Confirm `https://your-domain.com` loads the homepage.
2. Point Stripe’s webhook at `/api/webhooks/stripe` and set `STRIPE_WEBHOOK_SECRET`.
3. Seed the owner account if it does not exist yet.
4. Confirm `/admin/login` works.
5. Watch the first hourly cron in Vercel → **Settings → Crons** (or the
   function logs for `/api/cron/reminders`).
