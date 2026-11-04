# SocietyBuy project rules

Product: a group-buying web app (PWA) for Indian housing societies. Residents of a society pool monthly orders for shelf-stable groceries and household supplies; the platform buys from wholesalers at slab prices and delivers once to the society drop point.

Stack (do not change without asking): Next.js 14 App Router, TypeScript (strict), Tailwind CSS, PostgreSQL with Prisma, Zod for validation, Vitest for unit tests, Playwright for end-to-end tests. Package manager: pnpm.

Rules
1. All money is stored as integer paise. Never use floats for money. Format with a single helper `formatINR(paise)`.
2. Every state change on cycles, orders, payments, purchase orders and deliveries writes a row to `audit_logs` (actor, action, entity, before, after, timestamp).
3. State changes go through service functions in `src/server/services/*`, never directly from route handlers or components.
4. Payment webhooks are idempotent (store provider event id, ignore repeats).
5. Every query for society data is scoped by society id and by role. Write tests for cross-society access.
6. Business rules (pricing, cycle state machine, refunds) live in pure functions under `src/server/domain/*` with unit tests. Do not bury them in UI code.
7. External services (OTP, WhatsApp, Razorpay) sit behind adapter interfaces in `src/server/adapters/*` with a mock implementation selected by env var. Default everything to mock so the app runs with no keys.
8. UI: mobile-first (360px), large tap targets, English plus Hindi language switch via an i18n dictionary, UPI-first payment flow, Indian number formatting (Rs 1,23,456), plain language. No dark patterns, no pre-ticked consent boxes.
9. Never invent legal text. Put placeholders marked `TODO_LEGAL` for terms, privacy notice and grievance officer details.
10. Never display a selling price above MRP.
11. Before finishing any task: run typecheck, lint, unit tests and the relevant Playwright test, and attach results in the walkthrough.
12. Keep commits small, with clear messages. Write a short README section for each module you add.