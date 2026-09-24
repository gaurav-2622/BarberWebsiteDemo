# Barbershop Website & Booking Platform - Master Specification

## PROJECT GOAL
Build a premium, modern, mobile-first website and booking management system for a US barbershop. The business owner must be able to manage services, prices, working hours, appointments, availability, and payments. Customers must be able to book appointments online.

## TECH STACK & ARCHITECTURE
- **Framework:** Next.js 15+ (App Router) with TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (use `npx shadcn@latest add [component]`)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Auth.js (NextAuth) v5 with Prisma adapter
- **Payments:** Stripe Checkout & Webhooks (Test mode default)
- **Emails:** Resend

## EXECUTION STRATEGY
This project must be built in 6 strict phases. Do not jump ahead to future phases. At the end of every phase, update a file called `IMPLEMENTATION_STATUS.md` with completed features, files changed, tests run, known bugs, and the next milestone.

- **Phase 1:** Foundation & Database (Next.js, Prisma, Schema, Seed data)
- **Phase 2:** Website & Services (Homepage, UI/UX, Barber profiles)
- **Phase 3:** Booking Engine (Multi-step UI, Real-time availability, double-booking prevention)
- **Phase 4:** Payments (Stripe Checkout, Webhooks, Deposits)
- **Phase 5:** Admin Dashboard (Auth.js, Owner dashboard, Schedule/Service management)
- **Phase 6:** Emails & Polish (Resend, Reminders, Testing, Deployment)