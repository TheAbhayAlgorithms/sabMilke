# SocietyBuy

**SocietyBuy** is a hyper-local group-buying web application (PWA) designed for Indian housing societies. Residents pool monthly orders for shelf-stable staples (rice, atta, edible oils, pulses, tea, spices, detergents) at wholesale slab prices. Goods arrive in a single delivery to the society drop point, where residents collect via high-contrast QR passes handed over by volunteer Captains.

---

## 1. Quick Start

### Prerequisites
- Node.js 18+ (tested on Node v20 & v26)
- PostgreSQL 14+ (running locally on port 5432)
- `pnpm` (v10+ / v12+)

### Setup
```bash
# 1. Clone repository & install dependencies
pnpm install

# 2. Setup environment variables
cp .env.example .env
# Edit .env with your local PostgreSQL credentials (e.g. postgresql://localhost:5432/societybuy)

# 3. Synchronize database schema
pnpm prisma db push

# 4. Seed demo dataset (100 flats, 30 residents, 1 captain, 3 suppliers, 25 SKUs with 3-tier slabs)
pnpm seed

# 5. Start development server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 2. Seed Accounts & Roles

All accounts are pre-configured in demo mode with test OTP `123456`:

| Role | Name | Phone | Context |
| :--- | :--- | :--- | :--- |
| **Resident** | Aarav Sharma | `9876543211` | Flat A-101 (Green Glen Heights) |
| **Society Captain** | Vikram Sharma | `9876543210` | Flat A-402 (Green Glen Heights) |
| **Society Admin (RWA)** | Ramesh Gupta | `9876543299` | Flat B-201 (RWA Secretary) |
| **Wholesale Supplier** | Apex Agro Wholesale Rep | `9876543301` | Apex Agro Wholesalers Portal |
| **Platform Admin** | Ananya Roy | `9876543200` | Platform Admin Console |

Use the **"Seed Users Quick Login"** panel on the `/login` screen to sign in with one tap.

---

## 3. Core Architecture & Modules

### 3.1 Financial Integrity (`src/lib/money.ts`)
- **Rule 1**: All monetary amounts are stored strictly as integer paise (`Int`).
- Floating point numbers for money are forbidden and caught by unit tests.
- Formatting helper: `formatINR(paise)` formats currency using Indian numbering (e.g. `₹1,23,456` or `₹1,23,456.50`).

### 3.2 Audit Logging (`src/server/services/auditService.ts`)
- **Rule 2**: Every state transition on cycles, orders, payments, POs, and deliveries creates an immutable entry in `AuditLog` (`actorId`, `action`, `entity`, `entityId`, `before`, `after`, `ipAddress`, `createdAt`).

### 3.3 Multi-Tenant Society Scoping & Guards (`src/server/auth/guards.ts`)
- **Rule 5**: Every society query is isolated by `societyId` and user `role`. Cross-society data access attempts throw `CrossSocietyAccessError`.
- `requireAuth`, `requireRole`, `requireSocietyAccess`, `requireSupplier`, `requirePlatformAdmin`.

### 3.4 Zero-Key Adapters (`src/server/adapters/*`)
- **Rule 7**: All third-party services sit behind clean adapter interfaces with default mock implementations:
  - `MockOtpAdapter`: Universal test OTP (`123456`) and console logger.
  - `MockPaymentAdapter`: Simulates UPI intent, card payments, instant success, failure toggling, and delayed webhooks.
  - `MockNotificationAdapter`: Persists in-app, WhatsApp, and SMS alerts to the database.

### 3.5 Localization (`src/i18n/*`)
- **Rule 8**: Full English and Hindi (`हिंदी`) language switcher with plain-language terms.
- Persisted in browser localStorage with instant client-side switching.

### 3.6 Catalogue & Slabs Domain Engine (`src/server/domain/*`)
- **Slab Validation (`slabValidation.ts`)**:
  - Enforces non-overlapping, contiguous volume tiers (`slab[i].minQty === slab[i-1].maxQty + 1`).
  - **Rule 10 Enforcement**: Supplier wholesale price can never exceed the SKU's MRP.
  - Ensures decreasing or equal prices at higher volume tiers (discount ladder principle).
  - All prices stored and validated strictly as integer paise.
- **FSSAI Compliance Engine (`catalogueValidation.ts`)**:
  - Enforces mandatory 14-digit FSSAI license numbers on all food items.
  - Non-food lines exempt from FSSAI requirements.
- **Bulk CSV Parser (`csvParser.ts`)**:
  - Validates CSV rows line-by-line with itemized error reporting (row numbers, failed field, exact error message).
- **Quotes & Comparison Service (`src/server/services/quoteService.ts`)**:
  - Multi-supplier quote comparison matrix per SKU with consumer prices, margins, and savings percentages.

### 3.7 Cycle State Machine & Dynamic Pricing Engine (`src/server/domain/*`, `src/server/services/cycleService.ts`)
- **Cycle Lifecycle State Machine (`cycleStateMachine.ts`)**:
  - Linear progression: `DRAFT` ➔ `OPEN` ➔ `LOCKED` ➔ `PO_SENT` ➔ `RECEIVED` ➔ `DISTRIBUTING` ➔ `CLOSED`.
  - Exits: `OPEN` ➔ `CANCELLED` (when society minimums are not met at deadline), `PO_SENT` ➔ `PARTIAL` (short supply), any ➔ `DISPUTED` (admin override).
  - Strict compliance check: opening a cycle is blocked if any food SKU lacks a valid 14-digit FSSAI license number.
- **Dynamic Pricing Engine (`pricing.ts`)**:
  - **Guaranteed Price (Join Price)**: Paid by residents upon joining the cycle: `(supplier price at Tier 1) + platform margin`, strictly capped at `mrpPaise`.
  - **Final Price (at Lock)**: Recomputed dynamically based on pooled society quantity: `(supplier price at the slab reached) + platform margin`, strictly capped at guaranteed price and MRP.
  - **Refund Delta**: Price difference `guaranteedPrice - finalPrice` per unit credited directly to resident wallets with `PRICE_DELTA_CREDIT` transactions.
- **Automated Supplier Selection (`supplierSelection.ts`)**:
  - Evaluates active supplier quotes satisfying MOQ and delivery target lead times.
  - Selects the cheapest quote at the reached volume tier; breaks ties using supplier rating (descending), then earliest quote timestamp.
  - Records full selection logic in `audit_logs`.
- **Automated Scheduled Lock Runner (`/api/cron/lock-cycles`)**:
  - Scans for cycles past their `locksAt` timestamp, evaluates society minimums (`minSocietyValuePaise` and `minHouseholds`), locks eligible cycles, and auto-refunds cancelled pools.
- **Platform Admin Cycle Manager (`/admin/cycles`, `/admin/cycles/[id]`)**:
  - Live demand aggregation dashboard showing per-SKU pooled quantities, reached slabs, next tier unlock targets, winning suppliers, and automated refund summaries.

### 3.8 Resident PWA, Orders, Payments, & DPDP Compliance (`src/server/services/*`, `src/app/(resident)/*`)
- **Resident Join Flow (`/join?code=...`, `societyService.ts`)**:
  - Residents join by entering a 6-character society code (e.g. `GGH100`) or clicking a Captain invite link.
  - Automatically loads society details, drop point, and flat directory; binds flat membership and writes to `audit_logs`.
- **Catalogue & Interactive Discount Ladder (`/catalogue`, `/sku/[id]`)**:
  - Mobile-first (360px viewport) product browsing with category filters, unit price display (₹/kg or ₹/L), and FSSAI badge display.
  - Dynamic SKU tier ladder showing current society pool volume, active discount tier, and "Order X more units across society to drop price".
  - Quick commerce benchmark comparison table (Zepto, Blinkit, Local Kirana) and Price Drop Guarantee explainer.
- **Cart & Wallet Deduction (`/cart`, `CartContext.tsx`)**:
  - Live client-side basket with subtotal calculation, MRP savings, and optional wallet balance deduction before checkout.
- **Checkout & UPI-First Payment Flow (`/checkout`, `orderService.ts`)**:
  - Displays registered flat and society drop point ("Basement 1 Clubhouse Loading Dock").
  - UPI Intent, QR, and Card payment selector; simulated instant mock payment adapter.
  - Enforces the "One active order per flat per cycle" constraint and stores amounts strictly in integer paise.
- **Pickup Pass & QR Verification (`/orders/[id]`)**:
  - Post-payment order dashboard featuring a large 6-digit Pickup PIN, SVG QR token, itemized invoice breakdown, and a 4-step progress timeline.
- **Captain Participation Hub (`/captain/participation`)**:
  - Dedicated volunteer Captain view with one-tap WhatsApp invite link sharing.
  - Live participation stats: total flats, flats ordered, flats pending, percentage participation, GMV, and total pooled units.
  - Filterable flat roster (All, Ordered, Pending) showing resident contact and order status.
- **Payment Webhook Idempotency (`/api/webhooks/razorpay`, `webhookService.ts`)**:
  - **Rule 4 Enforcement**: Signature verification using HMAC SHA-256 (`x-razorpay-signature`).
  - Records processed event IDs in `ProviderEvent`. Duplicate replays are identified and ignored with zero duplicate pool increments or credits (`{ received: true, duplicate: true, actionTaken: "IGNORED_DUPLICATE" }`).
- **Data Protection & Statutory Compliance (DPDP Act, `consentService.ts`)**:
  - **Rule 8**: Plain-language consent purpose checklist (Order Fulfillment, SMS/WhatsApp notifications, Demand Aggregation) with **zero pre-ticked checkboxes**.
  - One-tap consent revocation (`Revoke All in One Tap`).
  - Machine-readable JSON data export (`/api/user/data-export`) containing user profile, orders, wallet transactions, and active consents.
  - Soft account deletion and anonymization (`/api/user/delete-account`).
  - **Rule 9**: All statutory disclaimers, Terms of Service, and Grievance Redressal Officer references tagged with `TODO_LEGAL`.

### 3.9 Wholesale Procurement, Goods Receipt, Handover & Invoicing (`src/server/services/*`, `src/app/*`)
- **Wholesale Purchase Orders (`procurement.ts`, `purchaseOrderService.ts`, `/admin/cycles/[id]`)**:
  - Automatically aggregates winning supplier quotes and pooled quantities per supplier for locked cycles.
  - Interactive "Preview Purchase Orders" view displaying wholesale pricing, lead times, and MOQ checks.
  - Generates immutable purchase orders with unique number format (`PO-YYYY-SOCIETY-CYCLE-SEQ`), transitioning cycle to `PO_SENT` and orders to `ALLOCATED`.
- **Supplier Portal PO Management (`/supplier/purchase-orders`, `/supplier/purchase-orders/[id]`)**:
  - Wholesalers view assigned purchase orders with drop point delivery directions and line items.
  - One-tap PO Acceptance (`CONFIRMED`).
  - Tax invoice cloud reference/PDF upload (`uploadSupplierInvoice`).
  - Dispatch marking (`DISPATCHED`) recording transit timestamp and alerting volunteer Captains.
- **Captain Goods Receipt & Shortage Refunds (`goodsReceiptService.ts`, `/captain/goods-receipt`)**:
  - Society drop point receiving screen to inspect incoming supplier deliveries.
  - Itemized quantity checking against expected PO quantities.
  - **Automatic Shortage Refund Engine (`calculateShortSupplyAllocations`)**: Detected shortages auto-credit resident wallets with `SHORT_SUPPLY_REFUND` transactions via FIFO allocation across order items. Generates formal credit notes. Cycle moves to `PARTIAL` or `DISTRIBUTING`.
- **Per-Flat Distribution Packing Sheet (`distributionService.ts`, `/captain/packing-list`)**:
  - Printable bagging sheet grouped by tower and flat with interactive check-off boxes, pickup PINs, and resident phone contacts.
  - Accurately adjusts for short-supplied units, displaying net deliverable items.
- **QR Handover & Pickup PIN Scanner (`/captain/handover`)**:
  - Quick lookup by resident 6-digit pickup PIN or QR token.
  - Supports itemized verification, partial collection tracking, and full completion (`HANDED_OVER`), logging collection events with Captain attribution in `audit_logs`.
- **Statutory GST Tax Invoice & Credit Notes (`taxInvoice.ts`, `invoiceService.ts`, `/orders/[id]/invoice`)**:
  - Pure tax computation engine (`computeGstBreakup`) deriving taxable amount, CGST, SGST, or IGST from GST-inclusive prices in integer paise.
  - Printable official resident tax invoice layout featuring HSN codes, tax breakups, and strict `TODO_LEGAL` statutory disclosures (GSTIN, CIN, PAN, registered office, grievance officer).
  - Formal credit note generation for refunded lines.

### 3.10 Grievance Desk, Notifications & Analytics (Milestone 6)
- **Grievance Desk with 48-Hour SLA (`tickets.ts`, `ticketService.ts`, `/tickets`, `/admin/tickets`)**:
  - Pure domain rules: Enforces 24-hour reporting window following goods collection (`isOrderEligibleForTicket`). Computes 48-hour statutory acknowledgement SLA countdown and 30-day resolution target (`computeTicketSla`).
  - Resident Issue Submission: Uploads photographic evidence, selects category (`DAMAGED_PACK`, `MISSING_ITEM`, `QUALITY_ISSUE`, `OTHER`), with live SLA timer.
  - Grievance Officer Console: Interactive SLA tracker (`Pending 48h Ack`, `In Investigation`, `Resolved & Refunded`, `SLA Breaches`). One-click formal acknowledgement freezes SLA timer, direct messaging with resident, and resolution flow crediting integer paise refunds to resident wallet (`TICKET_REFUND`) with automated GST credit note generation.
- **Multi-Channel Notification Center (`notificationService.ts`, `/notifications`)**:
  - Supports all 10 core lifecycle triggers: `CYCLE_OPENED`, `TIER_UNLOCKED`, `LOCK_REMINDER_24H`, `LOCK_REMINDER_2H`, `PAYMENT_SUCCESS`, `CYCLE_LOCKED`, `REFUND_ISSUED`, `GOODS_ARRIVED`, `READY_TO_COLLECT`, `ISSUE_UPDATE`.
  - Dispatches across In-App, WhatsApp, and SMS via mock adapters writing to database and console.
  - Notification Bell in header with unread badge counter; `/notifications` page with All/Unread filtering, trigger icons, relative timestamps, and "Mark all read".
- **Retail Benchmark Pricing (`benchmarkService.ts`, `/admin/benchmarks`, `/savings`)**:
  - Competitor benchmark price manager (Zepto, Blinkit, Local Kirana, BigBasket) enforcing MRP ceilings (Rule 10) and integer paise (Rule 1).
  - High-visibility "You saved ₹X versus nearby retail" callout on resident savings, cart, and SKU views.
- **Analytics Dashboards (`analytics.ts`, `analyticsService.ts`, `/admin/analytics`, `/society-admin`)**:
  - Platform Admin: Comprehensive GMV dashboard with participating households, overall participation %, effective savings %, supplier fill rate %, refund rate %, society contribution table, and supplier performance matrix.
  - Society Admin (RWA Committee): Society pooled GMV, participating flats %, resident price drop savings, and automated 2% RWA Community Development Rebate fund in integer paise.

### 3.11 Security Hardening, Multi-Tenancy & Compliance Pass (Milestone 7)
- **Rate Limiting (`src/server/security/rateLimiter.ts`)**:
  - Sliding-window in-memory rate limiter protecting authentication endpoints.
  - Limits OTP generation (`checkOtpSendRateLimit`) and verification attempts (`checkOtpVerifyRateLimit`) to 5 attempts per minute per phone number, returning HTTP `429 Too Many Requests` with a `Retry-After` header.
- **CSRF Protection (`src/server/security/csrf.ts`)**:
  - Origin and Host header validator for state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
  - Automatic bypass for signature-verified webhooks (`/api/webhooks/*`).
- **PII Masking & Secrets Sanitization (`src/server/security/masking.ts`)**:
  - Indian phone number masking (`maskPhone`: `98******10`), email masking (`maskEmail`: `j***e@example.com`), and OTP redaction (`maskOtp`: `******`).
  - Deep recursive audit sanitizer (`sanitizeAuditData`) that scrubs all API keys, secrets, auth headers, passwords, cookies, and tokens before writing to `audit_logs`.
- **Cross-Society Multi-Tenant Isolation (Rule 5)**:
  - Enforced and tested at service boundaries: residents cannot place orders in other societies, view another resident's orders, or raise tickets on foreign orders. Captains cannot access foreign goods receipts or handovers. Society admins cannot query analytics outside their assigned society.
- **Error Boundaries & Empty States**:
  - Interactive client error boundary (`src/app/error.tsx`) with recovery actions in English and Hindi.
  - Branded 404 page (`src/app/not-found.tsx`) with quick navigation links.
  - Empty states across order history, cart, and catalogue searches.
- **Mobile-First PWA & Accessibility Compliance (Rule 8)**:
  - Verified 360px viewport rendering with zero horizontal overflow (`html, body { max-width: 100vw; overflow-x: hidden; }`).
  - Touch targets meet ergonomic minimums (>= 44x44px).
  - Full PWA `public/manifest.json` with theme color `#16a34a` and standalone display.
- **Production Integration & Statutory Documentation**:
  - [`docs/provider-swap.md`](./docs/provider-swap.md): Step-by-step guide to plug real Razorpay payment gateway, Indian SMS OTP (MSG91/DLT), and WhatsApp Cloud API.
  - [`docs/compliance-checklist.md`](./docs/compliance-checklist.md): Statutory launch checklist for Indian housing societies (GST TCS Section 52, FSSAI Central Aggregator License, DPDPA 2023, Consumer Protection E-Commerce Rules 2020, Legal Metrology, and complete inventory of `TODO_LEGAL` markers).

---

## 4. Database Commands

```bash
# Push schema changes to PostgreSQL
pnpm prisma db push

# Launch Prisma Studio GUI
pnpm prisma:studio

# Seed demo dataset
pnpm seed

# Wipe database clean
pnpm reset
```

---

## 5. Verification & Testing

```bash
# Typecheck (TypeScript strict mode)
pnpm typecheck

# Linting (Next.js & ESLint)
pnpm lint

# Vitest unit & integration test suite (124 tests across 24 test files)
pnpm test

# Playwright end-to-end test suite
pnpm test:e2e
```

