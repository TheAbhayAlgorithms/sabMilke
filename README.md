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
# Typecheck
pnpm typecheck

# Linting
pnpm lint

# Vitest unit test suite (21+ tests)
pnpm test

# Playwright end-to-end tests
pnpm test:e2e
```

