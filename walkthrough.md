# Milestone 3 Walkthrough: Cycle State Machine, Dynamic Pricing Engine, Lock Job & Admin Cycle Manager

Milestone 3 has been completed in strict accordance with the project rules and the user brief:
1. **Cycle State Machine (`src/server/domain/cycleStateMachine.ts`)**: Pure functions enforcing cycle lifecycle transitions (`DRAFT` ➔ `OPEN` ➔ `LOCKED` ➔ `PO_SENT` ➔ `RECEIVED` ➔ `DISTRIBUTING` ➔ `CLOSED`; exits: `CANCELLED`, `PARTIAL`, `DISPUTED`), FSSAI license verification blocking opening if any food SKU lacks a valid license, and society minimums evaluation (`minSocietyValuePaise` and `minHouseholds`).
2. **Dynamic Pricing Engine (`src/server/domain/pricing.ts`)**: Pure functions computing guaranteed price at join (`lowestTierSupplierPrice + margin`), final price at lock (`reachedTierSupplierPrice + margin`), price delta refund (`guaranteedPrice - finalPrice`), platform margins with minimum paise threshold, and progress to next discount tier.
3. **Supplier Selection Algorithm (`src/server/domain/supplierSelection.ts`)**: Evaluates candidate supplier quotes satisfying MOQ, validity window, and delivery target lead time; selects the cheapest wholesale price at the reached volume tier; breaks ties using supplier rating (descending), then quote creation timestamp (ascending); records detailed decision reasoning.
4. **Service Layer & Idempotent Audited Transitions (`src/server/services/cycleService.ts`)**:
   - `createCycle`: Provisions cycle in `DRAFT` status and automatically populates `CycleSku` rows for all catalogue items with initial guaranteed prices.
   - `openCycle`: Validates FSSAI compliance across all food SKUs and updates status to `OPEN`.
   - `lockCycle`: Evaluates society minimums (auto-cancels and refunds orders if minimums are not met, unless `isForceLock = true`), recomputes final prices, selects winning supplier quotes, updates order item prices and refund deltas, automatically credits price drop savings to resident wallets (`PRICE_DELTA_CREDIT`), and records state transitions and supplier decision trees in `audit_logs` (Rule 2).
   - `cancelCycle`: Auto-refunds all orders to resident wallets with `CANCELLATION_REFUND` transactions and updates `AuditLog`.
   - `lockExpiredCycles`: Scheduled cron job scanner that locks expired cycles past their `locksAt` timestamp.
5. **Admin Cycle Manager & Live Demand Aggregation UI**:
   - `/admin/cycles`: Society cycle dashboard showing status badges, participation counts, pooled GMV, and action buttons (`Open`, `Force Lock`, `Cancel`, `Create New Cycle`).
   - `/admin/cycles/[id]`: Live per-SKU pooled demand view displaying category, ordered volume, join price, reached volume tier, winning supplier quote, final price, refund delta, and savings vs MRP.
6. **Scheduled Lock Job Route**: `/api/cron/lock-cycles` (GET / POST) executing automated cycle locking.

---

## 1. Visual Walkthrough & Screenshots

### 1.1 Platform Admin Cycle Manager (`/admin/cycles`)
The Admin Cycle Manager lists housing society monthly cycles with aggregate metrics (society name, status, orders count, total pooled units, and society GMV in INR). Admins can create new cycles via modal, open DRAFT cycles, or trigger force-lock.

![Admin Cycles Manager](/Users/abhayrajsingh/.gemini/antigravity/brain/bc3f5e72-60b2-42f4-96c5-77a683fb5d34/screenshots/admin-cycles.png)

### 1.2 Live Per-SKU Pooled Demand & Tier Slabs (`/admin/cycles/[id]`)
Inspecting a live cycle reveals the per-SKU demand aggregation table. It tracks pooled quantities against supplier discount ladders, highlights the leading/winning supplier quote with rating and lead time, and calculates resident savings and price drop refunds.

![Live Cycle Pool Detail](/Users/abhayrajsingh/.gemini/antigravity/brain/bc3f5e72-60b2-42f4-96c5-77a683fb5d34/screenshots/admin-cycle-pool-detail.png)

---

## 2. Test & Verification Results

### 2.1 Vitest Unit & Integration Test Suite (70 tests passing)
Milestone 3 added 30 new unit and integration tests across:
- `tests/unit/cycleStateMachine.test.ts` (10 tests)
- `tests/unit/pricing.test.ts` (10 tests)
- `tests/unit/supplierSelection.test.ts` (7 tests)
- `tests/unit/cycleService.test.ts` (3 integration tests)

```bash
$ pnpm test

 ✓ tests/unit/supplierSelection.test.ts (7)
 ✓ tests/unit/pricing.test.ts (10)
 ✓ tests/unit/slabValidation.test.ts (8)
 ✓ tests/unit/catalogueValidation.test.ts (5)
 ✓ tests/unit/csvParser.test.ts (4)
 ✓ tests/unit/cycleStateMachine.test.ts (10)
 ✓ tests/unit/cycleService.test.ts (3)
 ✓ tests/unit/authGuards.test.ts (5)
 ✓ tests/unit/seedAuthRoles.test.ts (6)
 ✓ tests/unit/adapters.test.ts (4)
 ✓ tests/unit/quoteService.test.ts (2)
 ✓ tests/unit/money.test.ts (5)
 ✓ tests/unit/audit.test.ts (1)

 Test Files  13 passed (13)
      Tests  70 passed (70)
```

### 2.2 Playwright End-to-End Suite (18 tests passing)
All 18 Playwright end-to-end tests passed across Desktop and Mobile viewports:
- `tests/e2e/cyclesAdmin.spec.ts`: Tests Admin viewing `/admin/cycles`, inspecting live pool detail `/admin/cycles/[id]`, creating a new cycle, opening a DRAFT cycle, and triggering force-lock with price computations.
- `tests/e2e/catalogueAndQuotes.spec.ts`: Tests supplier quote submission and admin quote comparison matrix.
- `tests/e2e/authSmoke.spec.ts`: Tests resident and captain OTP login and Hindi/English switching.
- `tests/e2e/milestone3Screenshots.spec.ts`: Captures full-page screenshots of the Cycle Manager and live pool detail.

```bash
$ pnpm test:e2e

Running 18 tests using 5 workers
  ✓ 18 passed (12.2s)
```

### 2.3 Code Quality & Strict Typing
- **TypeScript Typecheck (`pnpm typecheck`)**: Passed with 0 errors.
- **ESLint (`pnpm lint`)**: Passed with 0 warnings or errors.
- **Financial Rule 1**: Integer paise throughout (`guaranteedPricePaise`, `finalPricePaise`, `refundDeltaPaise`, `minSocietyValuePaise`).
- **Audit Rule 2**: All cycle state changes (`CYCLE_CREATED`, `CYCLE_OPENED`, `CYCLE_LOCKED`, `CYCLE_CANCELLED`) write rows to `audit_logs` with before/after state snapshots and supplier decision reasoning.
