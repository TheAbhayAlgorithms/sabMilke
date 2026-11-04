# SocietyBuy Implementation Plan

**SocietyBuy** is a hyper-local group-buying PWA for Indian housing societies, enabling residents to pool monthly demand for staples at wholesale slab prices, with transparent discount ladders, UPI-first checkout, automated supplier selection, goods receipt discrepancy management, and doorstep handover via QR codes.

---

## 1. System Architecture & Tech Stack

### 1.1 Stack Confirmation
- **Framework:** Next.js 14 (App Router, Server Actions, Route Handlers)
- **Language:** TypeScript 5.x (Strict mode, zero `any`)
- **Styling:** Tailwind CSS (Mobile-first, 360px baseline, Indian localized UI, clean contrast)
- **Database & ORM:** PostgreSQL + Prisma ORM
- **Validation:** Zod schemas for all domain inputs, forms, and API payloads
- **Unit & Integration Testing:** Vitest (40+ unit tests across pure domain logic)
- **End-to-End Testing:** Playwright (Full cycle: onboarding -> cart -> mock UPI -> cycle lock -> supplier PO -> goods receipt with shortage -> refund -> QR handover -> ticket)
- **Package Manager:** `pnpm`

### 1.2 Proposed Additional Dependencies (Subject to User Approval)
In accordance with the project rule ("Ask me before adding any dependency not in the stack"):
1. `lucide-react`: Lightweight iconography for mobile UI and admin consoles.
2. `clsx` & `tailwind-merge`: Reliable class merging for component variants.
3. `qrcode`: Generating SVG/DataURL QR codes for resident order collection and packing lists.
4. `jose`: Edge-compatible JWT signing and verification for session tokens (phone OTP auth).
5. `canvas-confetti` (optional): Visual celebration on tier unlock and order completion.

---

## 2. Directory Structure

```
societybuy/
├── GEMINI.md
├── implementation_plan.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── mock/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/                 # Landing, How it works, FAQ, Legal (TODO_LEGAL)
│   │   │   ├── page.tsx
│   │   │   ├── how-it-works/page.tsx
│   │   │   ├── faq/page.tsx
│   │   │   ├── terms/page.tsx
│   │   │   ├── privacy/page.tsx
│   │   │   └── grievance/page.tsx
│   │   ├── (auth)/                   # Phone OTP login, Society Join Code
│   │   │   ├── login/page.tsx
│   │   │   └── join/page.tsx
│   │   ├── (resident)/               # Resident mobile-first PWA (/app/*)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Home with cycle countdown & society tier progress
│   │   │   ├── catalogue/page.tsx    # Category filter, search, tier ladder preview
│   │   │   ├── product/[id]/page.tsx # SKU details, unit price, FSSAI, discount ladder
│   │   │   ├── cart/page.tsx         # Cart breakdown, savings preview
│   │   │   ├── checkout/page.tsx     # UPI payment flow, wallet balance deduction
│   │   │   ├── orders/               # Orders list & order detail with status timeline
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── collect/[id]/page.tsx # QR code pickup pass & PIN
│   │   │   ├── tickets/              # Raise ticket with photo, view 48h SLA timer
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── wallet/page.tsx       # Ledger, credits, withdrawal info
│   │   │   ├── savings/page.tsx      # Lifetime savings vs retail benchmarks
│   │   │   └── profile/              # Language toggle, consent history, data export, account deletion
│   │   │       └── page.tsx
│   │   ├── (captain)/                # Captain volunteer portal (/captain/*)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Society participation dashboard & WhatsApp invite share
│   │   │   ├── approvals/page.tsx    # Resident flat verification & approvals
│   │   │   ├── receiving/page.tsx    # Goods receipt recording & discrepancy logging
│   │   │   ├── handover/page.tsx     # QR camera scanner / manual code entry for collection
│   │   │   └── packing-slips/page.tsx # Printable per-flat distribution lists
│   │   ├── (society-admin)/          # RWA committee read-only portal (/society-admin/*)
│   │   │   └── page.tsx              # GMV, household participation, savings, society rebate report
│   │   ├── (supplier)/               # Wholesaler portal (/supplier/*)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── quotes/page.tsx       # Price slab manager (minQty, pricePaise, validity, lead time)
│   │   │   ├── purchase-orders/      # PO list, confirmation, dispatch marker
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── invoices/page.tsx     # Upload invoice PDF against PO
│   │   ├── (platform-admin)/         # Platform admin console (/admin/*)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Executive metrics & GMV
│   │   │   ├── societies/page.tsx    # Society management, drop points, captain assignments
│   │   │   ├── catalogue/page.tsx    # SKU management, CSV import, FSSAI verification
│   │   │   ├── cycles/               # Create, open, force-lock, cancel, tier simulation
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx     # Live pooled quantity & reached slab visualization
│   │   │   ├── quotes/page.tsx       # Quote comparison matrix per SKU
│   │   │   ├── purchase-orders/page.tsx # PO generation preview & dispatch tracker
│   │   │   ├── deliveries/page.tsx   # Receiving status & shortage reconciliation
│   │   │   ├── refunds/page.tsx      # Refund queue & wallet transactions
│   │   │   ├── tickets/page.tsx      # Grievance officer dashboard & dispute escalation
│   │   │   ├── benchmarks/page.tsx   # Retail benchmark price maintenance
│   │   │   └── audit-logs/page.tsx   # Comprehensive audit log viewer
│   │   └── api/                      # Route Handlers
│   │       ├── auth/                 # Send OTP, verify OTP, session, logout
│   │       ├── webhooks/razorpay/route.ts # Idempotent webhook handler
│   │       ├── cron/lock-cycles/route.ts  # Scheduled cycle locker
│   │       ├── orders/[id]/invoice/route.ts # GST compliant resident tax invoice PDF/HTML
│   │       ├── export/user-data/route.ts # Compliance data export (JSON/CSV)
│   │       └── admin/catalogue/upload/route.ts # CSV catalogue bulk import
│   ├── components/                   # UI Components
│   │   ├── ui/                       # Buttons, inputs, modals, cards, badges, alert banners
│   │   ├── common/                   # Header, footer, language switcher, legal disclaimer
│   │   ├── resident/                 # TierLadder, ProductCard, CountdownTimer, QRViewer
│   │   ├── captain/                  # Scanner, DiscrepancyForm, FlatChecklist
│   │   └── admin/                    # AuditTable, QuoteComparator, SkuEditor
│   ├── i18n/                         # Internationalization dictionary
│   │   ├── index.ts                  # Language context & translation hooks
│   │   ├── en.json                   # English dictionary
│   │   └── hi.json                   # Hindi dictionary (हिंदी)
│   ├── lib/                          # Client utilities
│   │   ├── formatters.ts             # formatINR(paise), formatQty, formatDate
│   │   ├── session.ts                # Session resolution & JWT handling
│   │   └── validations/              # Zod schemas for forms
│   └── server/                       # Backend architecture
│       ├── adapters/                 # External service interfaces + Mock/Real implementations
│       │   ├── payment/              # PaymentAdapter, MockPaymentAdapter, RazorpayAdapter
│       │   ├── otp/                  # OtpAdapter, MockOtpAdapter, Twilio/Msg91Adapter
│       │   ├── notification/         # NotificationAdapter, MockNotificationAdapter, WhatsAppAdapter
│       │   └── storage/              # FileStorageAdapter, LocalStorageAdapter, S3Adapter
│       ├── domain/                   # PURE BUSINESS LOGIC (100% test coverage)
│       │   ├── cycleStateMachine.ts  # State machine: DRAFT->OPEN->LOCKED->PO_SENT->RECEIVED->DISTRIBUTING->CLOSED
│       │   ├── pricing.ts            # Tier ladder, guaranteedPrice, finalPrice, refundDelta, MRP capping
│       │   ├── supplierSelection.ts  # Lowest price at reached slab satisfying MOQ & lead time + tie-breaking
│       │   ├── taxCalculator.ts      # Backward GST extraction (CGST/SGST/IGST) from inclusive paise
│       │   ├── shortSupply.ts        # Discrepancy calculator & auto-refund generation
│       │   └── compliance.ts         # FSSAI enforcement, consent validation, data retention
│       ├── services/                 # STATE-CHANGING ORCHESTRATION (Audit-logged)
│       │   ├── auditService.ts       # Central audit logging
│       │   ├── authService.ts        # OTP authentication & role authorization
│       │   ├── cycleService.ts       # Open, lock, cancel, price recalculation
│       │   ├── orderService.ts       # Place order, cancel, update status
│       │   ├── paymentService.ts     # Create payment, verify webhook, refund delta
│       │   ├── poService.ts          # Generate POs to cheapest suppliers
│       │   ├── receivingService.ts   # Record goods receipt, handle discrepancies
│       │   ├── handoverService.ts    # QR code validation & handover logging
│       │   ├── ticketService.ts      # Issue raising, SLA tracking, resolution
│       │   ├── walletService.ts      # Ledger credits/debits & withdrawals
│       │   └── notificationService.ts # In-app, WhatsApp, SMS dispatching
│       └── db/                       # Prisma client instance & repository helpers
│           ├── client.ts
│           └── scopedQuery.ts        # Society & role-scoped query wrappers
└── tests/
    ├── domain/                       # Pure unit tests (Vitest)
    │   ├── cycleStateMachine.test.ts
    │   ├── pricing.test.ts
    │   ├── supplierSelection.test.ts
    │   ├── taxCalculator.test.ts
    │   ├── shortSupply.test.ts
    │   ├── webhookIdempotency.test.ts
    │   ├── societyIsolation.test.ts
    │   └── noFloatMoney.test.ts      # AST/Regex linter test verifying no float for money
    └── e2e/                          # Playwright end-to-end tests
        ├── fullCycle.spec.ts         # End-to-end lifecycle test
        └── crossSocietySecurity.spec.ts # RBAC & isolation penetration test
```

---

## 3. Data Model (Prisma Schema Design)

All monetary fields are stored as **integer paise** (`Int`). No floats. All queries for society data are scoped by `societyId`. Soft delete and audit trails are pervasive.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  RESIDENT
  CAPTAIN
  SOCIETY_ADMIN
  PLATFORM_ADMIN
}

enum MembershipStatus {
  PENDING
  APPROVED
  REJECTED
  SUSPENDED
}

enum CycleStatus {
  DRAFT
  OPEN
  LOCKED
  PO_SENT
  RECEIVED
  DISTRIBUTING
  CLOSED
  CANCELLED
  PARTIAL
  DISPUTED
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  CONFIRMED
  ALLOCATED
  SHORT_SUPPLIED
  RECEIVED_AT_DROP
  HANDED_OVER
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  INITIATED
  SUCCESS
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum PurchaseOrderStatus {
  DRAFT
  ISSUED
  CONFIRMED
  DISPATCHED
  DELIVERED
  DISCREPANCY
  CANCELLED
}

enum TicketStatus {
  OPEN
  ACKNOWLEDGED
  IN_REVIEW
  RESOLVED
  REJECTED
}

enum WalletTxType {
  PRICE_DELTA_CREDIT
  SHORT_SUPPLY_REFUND
  CANCELLATION_REFUND
  TICKET_REFUND
  ORDER_PAYMENT
  WITHDRAWAL_TO_SOURCE
  CAPTAIN_REWARD
}

enum NotificationChannel {
  IN_APP
  WHATSAPP
  SMS
}

// -------------------------------------------------------------
// Societies, Flats & Users
// -------------------------------------------------------------

model Society {
  id                  String             @id @default(cuid())
  name                String
  slug                String             @unique
  joinCode            String             @unique
  addressLine         String
  city                String
  state               String
  pincode             String
  minSocietyValuePaise Int               @default(5000000) // Rs 50,000 default
  minHouseholds       Int                @default(10)
  rebatePercent       Decimal            @default(1.0)     // RWA rebate percentage
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  flats               Flat[]
  memberships         Membership[]
  dropPoints          DropPoint[]
  cycles              Cycle[]
  orders              Order[]
  auditLogs           AuditLog[]
}

model DropPoint {
  id           String      @id @default(cuid())
  societyId    String
  society      Society     @relation(fields: [societyId], references: [id], onDelete: Cascade)
  name         String      // e.g., "Clubhouse Gate 2", "Tower A Basement"
  description  String?
  instructions String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deliveries   Delivery[]
}

model User {
  id              String           @id @default(cuid())
  phone           String           @unique
  name            String
  isPhoneVerified Boolean          @default(false)
  deletedAt       DateTime?        // Soft delete
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  memberships     Membership[]
  supplierUser    SupplierUser?
  orders          Order[]
  wallet          Wallet?
  tickets         Ticket[]
  consents        Consent[]
  auditLogs       AuditLog[]       @relation("ActorAuditLogs")
  notifications   Notification[]
  ticketMessages  TicketMessage[]
  handoverEvents  HandoverEvent[]  @relation("HandedOverBy")
}

model Flat {
  id          String       @id @default(cuid())
  societyId   String
  society     Society      @relation(fields: [societyId], references: [id], onDelete: Cascade)
  flatNumber  String       // e.g., "A-402"
  tower       String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  memberships Membership[]
  orders      Order[]

  @@unique([societyId, flatNumber])
}

model Membership {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  societyId String
  society   Society          @relation(fields: [societyId], references: [id], onDelete: Cascade)
  flatId    String
  flat      Flat             @relation(fields: [flatId], references: [id], onDelete: Cascade)
  role      Role             @default(RESIDENT)
  status    MembershipStatus @default(PENDING)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@unique([userId, societyId])
  @@index([societyId, role])
}

// -------------------------------------------------------------
// Supplier & Catalogue
// -------------------------------------------------------------

model Supplier {
  id             String          @id @default(cuid())
  name           String
  legalName      String
  gstin          String          @unique
  fssaiNumber    String?
  phone          String
  email          String
  rating         Decimal         @default(4.5)
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  users          SupplierUser[]
  quotes         SupplierQuote[]
  purchaseOrders PurchaseOrder[]
}

model SupplierUser {
  id         String   @id @default(cuid())
  userId     String   @unique
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  supplierId String
  supplier   Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Category {
  id        String    @id @default(cuid())
  name      String    @unique
  slug      String    @unique
  icon      String?
  products  Product[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Product {
  id          String   @id @default(cuid())
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  name        String
  brand       String
  description String?
  isFood      Boolean  @default(true)
  fssaiNumber String?  // Mandatory if isFood = true
  hsnCode     String
  gstRate     Decimal  // e.g. 0.0, 5.0, 12.0, 18.0
  skus        Sku[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Sku {
  id                 String              @id @default(cuid())
  productId          String
  product            Product             @relation(fields: [productId], references: [id], onDelete: Cascade)
  variantName        String              // e.g. "5 kg Bag", "1 L Pouch"
  packSize           Decimal             // 5.0
  unit               String              // "kg", "L", "piece"
  mrpPaise           Int                 // Maximum Retail Price in paise
  marginPercent      Decimal             @default(5.0) // Platform margin %
  marginMinPaise     Int                 @default(1000) // Minimum platform margin in paise
  imageUrl           String?
  isActive           Boolean             @default(true)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  quotes             SupplierQuote[]
  cycleSkus          CycleSku[]
  orderItems         OrderItem[]
  poItems            PurchaseOrderItem[]
  goodsReceiptItems  GoodsReceiptItem[]
  benchmarkPrices    BenchmarkPrice[]
}

model BenchmarkPrice {
  id            String   @id @default(cuid())
  skuId         String
  sku           Sku      @relation(fields: [skuId], references: [id], onDelete: Cascade)
  retailerName  String   // "Zepto", "Blinkit", "Local Kirana", "BigBasket"
  pricePaise    Int
  checkedAt     DateTime @default(now())
}

// -------------------------------------------------------------
// Supplier Quotes & Slabs
// -------------------------------------------------------------

model SupplierQuote {
  id           String      @id @default(cuid())
  supplierId   String
  supplier     Supplier    @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  skuId        String
  sku          Sku         @relation(fields: [skuId], references: [id], onDelete: Cascade)
  moq          Int         @default(1) // Minimum Order Quantity
  leadTimeDays Int         @default(2)
  validFrom    DateTime
  validTo      DateTime
  isActive     Boolean     @default(true)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  slabs        QuoteSlab[]

  @@index([skuId, isActive])
}

model QuoteSlab {
  id                 String        @id @default(cuid())
  quoteId            String
  quote              SupplierQuote @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  minQty             Int
  maxQty             Int?          // null means infinity
  supplierPricePaise Int           // Wholesaler price in paise at this volume tier
  createdAt          DateTime      @default(now())

  @@index([quoteId, minQty])
}

// -------------------------------------------------------------
// Cycles & Aggregation
// -------------------------------------------------------------

model Cycle {
  id                   String          @id @default(cuid())
  societyId            String
  society              Society         @relation(fields: [societyId], references: [id], onDelete: Cascade)
  name                 String          // e.g. "November 2026 Monthly Grocery Pool"
  status               CycleStatus     @default(DRAFT)
  opensAt              DateTime
  locksAt              DateTime
  deliveryTargetDate   DateTime
  minSocietyValuePaise Int
  minHouseholds        Int
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt
  cycleSkus            CycleSku[]
  orders               Order[]
  purchaseOrders       PurchaseOrder[]
  deliveries           Delivery[]

  @@index([societyId, status])
}

model CycleSku {
  id                     String   @id @default(cuid())
  cycleId                String
  cycle                  Cycle    @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  skuId                  String
  sku                    Sku      @relation(fields: [skuId], references: [id], onDelete: Cascade)
  pooledQuantity         Int      @default(0)
  guaranteedPricePaise   Int      // Resident price at join
  finalPricePaise        Int?     // Price reached at lock
  chosenSupplierQuoteId  String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@unique([cycleId, skuId])
}

// -------------------------------------------------------------
// Orders, Payments & Wallet
// -------------------------------------------------------------

model Order {
  id                   String          @id @default(cuid())
  cycleId              String
  cycle                Cycle           @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  societyId            String
  society              Society         @relation(fields: [societyId], references: [id], onDelete: Cascade)
  flatId               String
  flat                 Flat            @relation(fields: [flatId], references: [id])
  userId               String
  user                 User            @relation(fields: [userId], references: [id])
  status               OrderStatus     @default(PENDING_PAYMENT)
  totalGuaranteedPaise Int
  totalFinalPaise      Int?
  totalRefundPaise     Int             @default(0)
  pickupCode           String          @unique // 6-digit collection OTP/PIN
  qrCodeToken          String          @unique // Secure unique token for QR handover
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt
  items                OrderItem[]
  payments             Payment[]
  refunds              Refund[]
  invoices             Invoice[]
  tickets              Ticket[]
  handoverEvents       HandoverEvent[]

  @@unique([cycleId, flatId]) // One active order per flat per cycle
  @@index([societyId, status])
  @@index([userId])
}

model OrderItem {
  id                   String   @id @default(cuid())
  orderId              String
  order                Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  skuId                String
  sku                  Sku      @relation(fields: [skuId], references: [id])
  quantity             Int
  guaranteedPricePaise Int
  finalPricePaise      Int?
  shortSuppliedQty     Int      @default(0)
  refundDeltaPaise     Int      @default(0)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([orderId, skuId])
}

model Payment {
  id                String        @id @default(cuid())
  orderId           String
  order             Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  provider          String        @default("MOCK_RAZORPAY")
  providerPaymentId String?       @unique
  providerOrderId   String?       @unique
  amountPaise       Int
  status            PaymentStatus @default(INITIATED)
  paymentMethod     String?       // UPI_INTENT, UPI_COLLECT, CARD, NETBANKING
  upiVpa            String?
  errorMessage      String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  refunds           Refund[]
}

model Refund {
  id               String       @id @default(cuid())
  orderId          String
  order            Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  paymentId        String?
  payment          Payment?     @relation(fields: [paymentId], references: [id])
  amountPaise      Int
  reason           WalletTxType
  providerRefundId String?      @unique
  status           String       @default("SUCCESS")
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
}

model Wallet {
  id           String              @id @default(cuid())
  userId       String              @unique
  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  balancePaise Int                 @default(0)
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  transactions WalletTransaction[]
}

model WalletTransaction {
  id           String       @id @default(cuid())
  walletId     String
  wallet       Wallet       @relation(fields: [walletId], references: [id], onDelete: Cascade)
  amountPaise  Int          // Positive for credit, negative for debit
  type         WalletTxType
  referenceId  String?      // Order ID, Refund ID, etc.
  description  String
  createdAt    DateTime     @default(now())
}

// -------------------------------------------------------------
// Procurement & Fulfillment
// -------------------------------------------------------------

model PurchaseOrder {
  id               String              @id @default(cuid())
  poNumber         String              @unique
  cycleId          String
  cycle            Cycle               @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  supplierId       String
  supplier         Supplier            @relation(fields: [supplierId], references: [id])
  status           PurchaseOrderStatus @default(DRAFT)
  totalAmountPaise Int
  dispatchedAt     DateTime?
  expectedDelivery DateTime
  invoiceUrl       String?             // Supplier invoice uploaded
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
  items            PurchaseOrderItem[]
  goodsReceipts    GoodsReceipt[]
}

model PurchaseOrderItem {
  id                 String        @id @default(cuid())
  purchaseOrderId    String
  purchaseOrder      PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  skuId              String
  sku                Sku           @relation(fields: [skuId], references: [id])
  orderedQuantity    Int
  unitPricePaise     Int           // Wholesaler slab price
  totalPricePaise    Int
  createdAt          DateTime      @default(now())
}

model GoodsReceipt {
  id              String             @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder      @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  receivedBy      String             // Captain or Admin user ID
  notes           String?
  createdAt       DateTime           @default(now())
  items           GoodsReceiptItem[]
}

model GoodsReceiptItem {
  id               String       @id @default(cuid())
  goodsReceiptId   String
  goodsReceipt     GoodsReceipt @relation(fields: [goodsReceiptId], references: [id], onDelete: Cascade)
  skuId            String
  sku              Sku          @relation(fields: [skuId], references: [id])
  expectedQty      Int
  receivedQty      Int
  shortQty         Int          @default(0)
  discrepancyNote  String?
  createdAt        DateTime     @default(now())
}

model Delivery {
  id               String      @id @default(cuid())
  cycleId          String
  cycle            Cycle       @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  dropPointId      String
  dropPoint        DropPoint   @relation(fields: [dropPointId], references: [id])
  dispatchedAt     DateTime?
  deliveredAt      DateTime?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
}

model HandoverEvent {
  id               String      @id @default(cuid())
  orderId          String
  order            Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  handedOverById   String
  handedOverBy     User        @relation("HandedOverBy", fields: [handedOverById], references: [id])
  isPartial        Boolean     @default(false)
  collectedItems   Json?       // SKU ID and quantity handed over
  collectedAt      DateTime    @default(now())
}

model Invoice {
  id               String      @id @default(cuid())
  invoiceNumber    String      @unique
  orderId          String
  order            Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  totalTaxablePaise Int
  totalCgstPaise   Int
  totalSgstPaise   Int
  totalIgstPaise   Int
  totalAmountPaise Int
  invoiceData      Json        // Snapshot of lines, HSN, rates, TODO_LEGAL metadata
  createdAt        DateTime    @default(now())
}

// -------------------------------------------------------------
// Grievance, Customer Service & Tickets
// -------------------------------------------------------------

model Ticket {
  id               String          @id @default(cuid())
  orderId          String
  order            Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  userId           String
  user             User            @relation(fields: [userId], references: [id])
  category         String          // MISSING_ITEM, DAMAGED_PACK, QUALITY_ISSUE, OTHER
  subject          String
  description      String
  photoUrls        String[]
  status           TicketStatus    @default(OPEN)
  acknowledgedAt   DateTime?       // SLA: within 48h
  resolutionTarget DateTime        // SLA: within 30 days
  resolvedAt       DateTime?
  resolutionNotes  String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  messages         TicketMessage[]
}

model TicketMessage {
  id         String   @id @default(cuid())
  ticketId   String
  ticket     Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  senderId   String
  sender     User     @relation(fields: [senderId], references: [id])
  message    String
  createdAt  DateTime @default(now())
}

// -------------------------------------------------------------
// Compliance, Audit, Webhooks, Notifications
// -------------------------------------------------------------

model Consent {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  version    String   // e.g. "v1.0"
  purposes   String[] // ["ORDER_FULFILLMENT", "COMMUNICATION_WHATSAPP"]
  ipAddress  String?
  userAgent  String?
  isRevoked  Boolean  @default(false)
  consentedAt DateTime @default(now())
  revokedAt  DateTime?
}

model Referral {
  id         String   @id @default(cuid())
  referrerId String
  referredId String   @unique
  createdAt  DateTime @default(now())
}

model CaptainCredit {
  id         String   @id @default(cuid())
  userId     String
  societyId  String
  cycleId    String
  paiseEarned Int
  createdAt  DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  societyId  String?
  society    Society? @relation(fields: [societyId], references: [id], onDelete: SetNull)
  actorId    String?
  actor      User?    @relation("ActorAuditLogs", fields: [actorId], references: [id], onDelete: SetNull)
  action     String   // e.g., "CYCLE_LOCKED", "ORDER_PAID", "PO_ISSUED"
  entity     String   // "Cycle", "Order", "PurchaseOrder", "GoodsReceipt"
  entityId   String
  before     Json?
  after      Json?
  ipAddress  String?
  createdAt  DateTime @default(now())

  @@index([entity, entityId])
  @@index([societyId])
}

model ProviderEvent {
  id          String   @id @default(cuid())
  provider    String   // "RAZORPAY"
  eventId     String   @unique // Webhook idempotency key (x-razorpay-event-id)
  eventType   String
  payload     Json
  processedAt DateTime @default(now())
}

model Notification {
  id        String              @id @default(cuid())
  userId    String
  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  channel   NotificationChannel
  title     String
  body      String
  data      Json?
  isRead    Boolean             @default(false)
  sentAt    DateTime            @default(now())

  @@index([userId, isRead])
}
```

---

## 4. Pure Domain Logic Specifications (`src/server/domain/*`)

All domain rules are deterministic pure functions with 100% unit test coverage and zero database or I/O dependencies.

### 4.1 Cycle State Machine (`cycleStateMachine.ts`)
```typescript
export type CycleTransition = 
  | { from: 'DRAFT'; to: 'OPEN' }
  | { from: 'OPEN'; to: 'LOCKED' }
  | { from: 'OPEN'; to: 'CANCELLED'; reason: 'MINIMUM_NOT_MET' }
  | { from: 'LOCKED'; to: 'PO_SENT' }
  | { from: 'PO_SENT'; to: 'RECEIVED' }
  | { from: 'PO_SENT'; to: 'PARTIAL'; reason: 'SHORT_SUPPLY' }
  | { from: 'RECEIVED'; to: 'DISTRIBUTING' }
  | { from: 'DISTRIBUTING'; to: 'CLOSED' }
  | { from: CycleStatus; to: 'DISPUTED'; reason: string }; // Admin only override
```
- Throws `InvalidStateTransitionError` on illegal jumps (e.g. `OPEN` -> `DISTRIBUTING`).
- Validates pre-conditions:
  - Cannot transition `DRAFT` -> `OPEN` if any food SKU lacks `fssaiNumber`.
  - Cannot transition `OPEN` -> `LOCKED` without active orders.
  - Automatically branches to `CANCELLED` if `totalSocietyValue < minSocietyValuePaise` or `uniqueHouseholds < minHouseholds`.

### 4.2 Pricing, Slabs, and Price Guarantees (`pricing.ts`)
```typescript
export interface QuoteSlab {
  minQty: number;
  maxQty: number | null;
  supplierPricePaise: number;
}

export function computePlatformMargin(baseSupplierPaise: number, marginPercent: number, minMarginPaise: number): number {
  const percentageMargin = Math.round((baseSupplierPaise * marginPercent) / 100);
  return Math.max(percentageMargin, minMarginPaise);
}

export function computeGuaranteedPrice(lowestSlabSupplierPricePaise: number, marginPercent: number, minMarginPaise: number, mrpPaise: number): number {
  const margin = computePlatformMargin(lowestSlabSupplierPricePaise, marginPercent, minMarginPaise);
  const calculated = lowestSlabSupplierPricePaise + margin;
  return Math.min(calculated, mrpPaise); // Rule 10: Never exceed MRP
}

export function findReachedSlab(slabs: QuoteSlab[], pooledQuantity: number): QuoteSlab {
  const sorted = [...slabs].sort((a, b) => a.minQty - b.minQty);
  let reached = sorted[0];
  for (const slab of sorted) {
    if (pooledQuantity >= slab.minQty) {
      reached = slab;
    }
  }
  return reached;
}

export function computeFinalPrice(supplierPriceAtReachedSlabPaise: number, marginPercent: number, minMarginPaise: number, mrpPaise: number): number {
  const margin = computePlatformMargin(supplierPriceAtReachedSlabPaise, marginPercent, minMarginPaise);
  const calculated = supplierPriceAtReachedSlabPaise + margin;
  return Math.min(calculated, mrpPaise);
}

export function computeRefundDelta(guaranteedPricePaise: number, finalPricePaise: number): number {
  if (finalPricePaise > guaranteedPricePaise) {
    throw new Error("Final price can never exceed guaranteed price");
  }
  return guaranteedPricePaise - finalPricePaise;
}
```

### 4.3 Supplier Choice & Tie-Breaking at Lock (`supplierSelection.ts`)
- Inputs: List of eligible supplier quotes for a SKU, pooled society quantity, lead time cutoff.
- Filtering: Quotes active between cycle start and delivery date, `moq <= pooledQuantity`, `leadTimeDays <= maxAllowedLeadTime`.
- Slabs: Evaluate reached slab for each supplier quote.
- Scoring & Ranking:
  1. Primary: Lowest `supplierPricePaise` at reached slab.
  2. Secondary (Tie-breaker): Highest `supplier.rating`.
  3. Tertiary (Tie-breaker): Earliest quote creation timestamp.
- Produces explicit decision log stored in `AuditLog`.

### 4.4 Backward GST Computation (`taxCalculator.ts`)
- Staples in India often carry 0%, 5%, 12%, or 18% GST.
- Selling prices are GST-inclusive.
- `taxableAmountPaise = Math.round((sellingPricePaise * 10000) / (10000 + (gstRatePercent * 100)))`
- `totalTaxPaise = sellingPricePaise - taxableAmountPaise`
- Split evenly into `cgstPaise = Math.floor(totalTaxPaise / 2)` and `sgstPaise = totalTaxPaise - cgstPaise` (for intra-state), or `igstPaise` (inter-state).

### 4.5 Short-Supply Adjustment (`shortSupply.ts`)
- Compares `expectedQty` vs `receivedQty` on goods receipt.
- Calculates shortage per SKU.
- Allocates shortages to flat orders (FIFO or proportional).
- Calculates exact refund amount in paise: `shortQty * finalPricePaise`.
- Triggers wallet credit or direct payment refund.

---

## 5. External Service Adapters (`src/server/adapters/*`)

Each external integration has a clean TypeScript interface and a default mock implementation switchable via environment variables. The application boots and operates fully without any 3rd party API keys.

### 5.1 Payment Adapter (`payment/index.ts`)
```typescript
export interface CreatePaymentParams {
  orderId: string;
  amountPaise: number;
  customerPhone: string;
  customerName: string;
}

export interface PaymentResult {
  providerOrderId: string;
  amountPaise: number;
  currency: 'INR';
  keyId: string;
}

export interface IPaymentAdapter {
  createPaymentOrder(params: CreatePaymentParams): Promise<PaymentResult>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  issueRefund(paymentId: string, amountPaise: number, reason: string): Promise<{ refundId: string }>;
}
```
- `MockPaymentAdapter`:
  - Instant success mode.
  - Failure simulator mode (`simulateFailure=true`).
  - Delayed webhook simulator with trigger endpoint.
- `RazorpayAdapter`: Real Razorpay Node SDK implementation using test/production API keys.

### 5.2 OTP & Authentication Adapter (`otp/index.ts`)
```typescript
export interface IOtpAdapter {
  sendOtp(phone: string, otp: string): Promise<{ success: boolean; messageId: string }>;
  verifyOtp(phone: string, inputOtp: string, expectedOtp: string): boolean;
}
```
- `MockOtpAdapter`: Logs OTP to console and accepts fixed test OTP `123456` in development/test modes.

### 5.3 Notification Adapter (`notification/index.ts`)
```typescript
export interface INotificationAdapter {
  sendWhatsApp(phone: string, template: string, params: Record<string, string>): Promise<boolean>;
  sendSms(phone: string, message: string): Promise<boolean>;
}
```
- `MockNotificationAdapter`: Persists messages to `Notification` table in DB and logs structured payload to console.

---

## 6. Service Layer (`src/server/services/*`)

Every state change passes strictly through a service function that writes a row to `AuditLog`.

1. **`authService.ts`**:
   - `requestOtp(phone)`: Rate-limited OTP dispatch.
   - `verifyOtpAndLogin(phone, otp)`: Issues session token with user memberships.
   - `joinSociety(userId, joinCode, flatNumber)`: Creates flat (if needed) and membership.
2. **`cycleService.ts`**:
   - `openCycle(cycleId)`: Verifies FSSAI on food SKUs; transitions to `OPEN`.
   - `lockCycle(cycleId)`: Aggregates pooled SKUs, selects cheapest supplier quotes, calculates `finalPricePaise`, computes `refundDeltaPaise`, triggers refunds/credits to resident wallets, generates POs.
   - `cancelCycle(cycleId)`: Full refund for all orders; transitions to `CANCELLED`.
3. **`orderService.ts`**:
   - `createOrder(userId, societyId, cycleId, flatId, items)`: Checks for single active order per flat per cycle; computes guaranteed total.
   - `cancelOrder(orderId, userId)`: Pre-lock order cancellation.
4. **`paymentService.ts`**:
   - `initiatePayment(orderId, method)`: Creates payment record and adapter order.
   - `handleWebhook(event, eventId, payload)`: Checks `ProviderEvent` idempotency table; updates payment status to `SUCCESS`; transitions order to `CONFIRMED`.
5. **`receivingService.ts`**:
   - `recordGoodsReceipt(poId, actorId, items)`: Logs actual received quantities; marks PO `DELIVERED` or `DISCREPANCY`; creates automated short-supply refunds.
6. **`handoverService.ts`**:
   - `verifyAndHandover(qrToken, pickupCode, actorId, partialItems?)`: Validates token/code; records `HandoverEvent`; updates order to `HANDED_OVER`.
7. **`ticketService.ts`**:
   - `raiseTicket(userId, orderId, category, subject, description, photoUrls)`: Verifies 24-hour post-handover window; sets 48h acknowledgement SLA and 30-day resolution SLA.
   - `resolveTicket(ticketId, actorId, resolutionNotes, refundPaise?)`: Resolves dispute; issues wallet credit if refund specified.

---

## 7. User Experience & Screens Design

### 7.1 Design Tokens & Localized Experience
- **Mobile First**: Handheld viewport baseline (360px width) with thumb-friendly tap targets (minimum 44x44px).
- **Language Switch**: Toggle between English and Hindi (`EN` / `हिंदी`) stored in localStorage/cookie.
- **Indian Pricing & Formatting**: Helper `formatINR(paise)` producing standard format (e.g. `₹1,23,456`).
- **Transparency**: Clear display of MRP, Unit Price (e.g. `₹180 / kg`), Wholesale Tier Price, and "You Save ₹X (Y%)".
- **Visual Tier Ladder**: Progress bar showing current pooled units, reached price, and remaining units to next discount tier.

### 7.2 Core Screens
1. **Public Pages**:
   - Hero explaining group savings model ("Wholesale savings delivered once a month to your society").
   - Join code entry modal.
   - How It Works (Cycle timeline step-by-step).
   - Legal Pages with `TODO_LEGAL` placeholders: Terms of Service, Privacy Policy, Grievance Redressal Officer.
2. **Resident PWA**:
   - Phone Login with OTP.
   - Society Onboarding (Flat selection, Captain approval pending screen).
   - Home dashboard: Cycle timer countdown, society total pooled volume & milestones.
   - Catalogue & SKU Detail: Tier ladder with "Order X more units to reach ₹Y".
   - Cart & Checkout: UPI Intent/Collect/QR, wallet balance toggle.
   - My Orders & Live Status: Pending -> Paid -> Procuring -> Arrived -> Ready for Pickup.
   - Pickup Pass: Large high-contrast QR code + 6-digit PIN.
   - Savings Dashboard: Lifetime savings counter against retail benchmarks (Blinkit/Zepto/Kirana).
   - Wallet Ledger: Itemized price delta credits and refunds.
   - Consent & Privacy Settings: Purpose checkboxes (non-pre-ticked), one-tap revocation, data export download, account deletion.
3. **Captain Volunteer Portal**:
   - WhatsApp Invite generator (deep link with society join code).
   - Participation Tracker: Ordered vs Unordered flats in society.
   - Flat Resident Approval Queue.
   - Goods Receipt Discrepancy Logger (item-by-item checkbox & short count entry).
   - Handover Scanner (built-in camera QR reader or 6-digit code keypad).
   - Printable Distribution / Packing Slip per flat.
4. **Supplier Portal**:
   - Quote & Slab Editor: Configure price slabs per SKU, MOQ, and lead time.
   - PO Manager: Review POs, accept, upload GST invoice PDF, mark dispatched.
5. **Platform Admin Console**:
   - Society & Drop Point Manager.
   - Catalogue Manager: SKU creation, FSSAI verification toggle, CSV import.
   - Cycle Control Center: Open, Force Lock, Cancel, live pooled volume simulator.
   - Quotes Comparison Matrix: Side-by-side supplier slab comparison.
   - PO Preview & Dispatch Tracker.
   - Grievance Officer Ticket Desk: SLA countdown timers (48h ack, 30d resolution).
   - Retail Benchmark Price Editor.
   - System Audit Log Viewer with JSON before/after diffs.

---

## 8. Quality Assurance & Testing Plan

### 8.1 Unit Tests (Vitest - Target 40+ Tests)
1. **Cycle State Machine (`cycleStateMachine.test.ts`)**:
   - Valid transitions: `DRAFT` -> `OPEN` -> `LOCKED` -> `PO_SENT` -> `RECEIVED` -> `DISTRIBUTING` -> `CLOSED`.
   - Exit transitions: `OPEN` -> `CANCELLED`, `PO_SENT` -> `PARTIAL`, any -> `DISPUTED`.
   - Invalid jumps throw `InvalidStateTransitionError`.
   - FSSAI validation block on opening food SKUs without license.
2. **Pricing & Slabs (`pricing.test.ts`)**:
   - Margin calculation with minimum paise floor.
   - Slab selection across 0, middle, and upper tiers.
   - Guaranteed price capping at MRP (selling price never above MRP).
   - Final price calculation at reached slab.
   - `refundDelta` computation (positive or zero, never negative).
3. **Supplier Selection (`supplierSelection.test.ts`)**:
   - Selects cheapest supplier at reached volume.
   - Respects MOQ and lead time limits.
   - Tie-breaking: Higher supplier rating wins; earlier quote wins if rating matches.
4. **Tax Calculator (`taxCalculator.test.ts`)**:
   - Backward tax extraction on 0%, 5%, 12%, 18% GST items.
   - Verification that `taxable + cgst + sgst == grossPaise`.
5. **Short-Supply & Refunds (`shortSupply.test.ts`)**:
   - Discrepancy calculations and exact paise refund generation.
6. **Payment Webhook Idempotency (`webhookIdempotency.test.ts`)**:
   - Duplicate event IDs ignored without double processing or double credits.
7. **Society & Role Isolation (`societyIsolation.test.ts`)**:
   - Cross-society data access rejection (Tenant A cannot see Tenant B orders/cycles).
   - Role permission guard tests.
8. **No-Float Money Static Verification (`noFloatMoney.test.ts`)**:
   - AST/regex scan over `src/server` ensuring no `parseFloat`, floating arithmetic, or division without `Math.round`/`Math.floor`.

### 8.2 End-to-End Test (Playwright - `tests/e2e/fullCycle.spec.ts`)
Complete end-to-end user and operational journey:
1. Resident registers with phone OTP and joins demo society using join code.
2. Captain verifies and approves resident membership.
3. Resident browses catalogue, inspects tier ladder, adds 3 SKUs to cart.
4. Resident checks out using mock UPI payment.
5. System records payment via idempotent webhook, updates order to `PAID`.
6. Scheduled cycle locker triggers lock:
   - Slabs evaluated with pooled society quantity.
   - Final prices recomputed and refund deltas calculated.
   - Wallet credited with price difference.
   - POs generated for winning suppliers.
7. Supplier portal confirms PO and marks dispatched.
8. Captain records goods receipt with 1 short-supplied unit on an SKU.
9. Discrepancy service generates automatic refund for the missing unit.
10. Captain prints packing list, opens handover scanner, scans resident QR code.
11. Handover recorded and order marked `HANDED_OVER`.
12. Resident views order, raises ticket with photo attachment.
13. Grievance officer / Admin reviews ticket and resolves with credit note.

---

## 9. Milestones & Task Breakdown (PART C)

### Milestone 1: Project Scaffolding, Core Infrastructure & Database Schema
- [ ] Initialize Next.js 14 project with TypeScript strict mode, Tailwind CSS, Vitest, and Playwright.
- [ ] Configure `formatINR(paise)` helper and Indian localization utilities.
- [ ] Implement Prisma schema with all 30 models, relations, enums, and indexes.
- [ ] Setup PostgreSQL database connection and generate Prisma client.
- [ ] Build seed script (`prisma/seed.ts`) with 1 demo society (100 flats), 1 captain, 30 residents, 3 suppliers, 25 realistic Indian grocery SKUs with 3-tier slabs, 1 OPEN cycle at 40% tier, and 10 benchmark prices. Add `pnpm seed` and `pnpm reset`.
- [ ] Setup `audit_logs` service and generic scoped query utility.
- [ ] **Verification**: Run `pnpm typecheck`, `pnpm prisma db push`, `pnpm seed`. Produce `walkthrough.md`.

### Milestone 2: Pure Domain Logic & Unit Test Suite
- [ ] Implement `cycleStateMachine.ts` with strict transitions, cancel exits, and FSSAI checks.
- [ ] Implement `pricing.ts` (margins, guaranteed price, slab matching, final price, refund delta, MRP cap).
- [ ] Implement `supplierSelection.ts` (quote evaluation, MOQ/lead time filtering, rating tie-breakers).
- [ ] Implement `taxCalculator.ts` (backward GST calculation from inclusive paise).
- [ ] Implement `shortSupply.ts` (discrepancy resolution and refund allocation).
- [ ] Write 40+ Vitest unit tests covering all edge cases, society isolation, webhook idempotency, and the no-float money linter test.
- [ ] **Verification**: Run `pnpm test` (all 40+ unit tests passing). Produce `walkthrough.md`.

### Milestone 3: Adapters & Service Layer
- [ ] Implement `PaymentAdapter` interface, `MockPaymentAdapter` (success, failure, delayed webhook), and Razorpay adapter skeleton.
- [ ] Implement `OtpAdapter` and `MockOtpAdapter` (console logger, test OTP `123456`).
- [ ] Implement `NotificationAdapter` and `MockNotificationAdapter` (WhatsApp, SMS, In-App).
- [ ] Implement `orderService.ts` and `paymentService.ts` with idempotent webhook handler.
- [ ] Implement `cycleService.ts` (open, lock, reprice, cancel).
- [ ] Implement `poService.ts` and `receivingService.ts` with short-supply discrepancy handling.
- [ ] Implement `handoverService.ts`, `ticketService.ts`, and `walletService.ts`.
- [ ] **Verification**: Service integration tests; verified webhook idempotency and audit log entries. Produce `walkthrough.md`.

### Milestone 4: Resident Mobile-First PWA Experience
- [ ] Setup English/Hindi i18n dictionary system and language switch.
- [ ] Build phone OTP login and society join flow (join code + flat selector).
- [ ] Build resident home page with live countdown timer and society pooled progress.
- [ ] Build catalogue browser with category filters, search, and SKU cards showing MRP, unit price, and "You Save".
- [ ] Build SKU details page with interactive tier ladder ("Order X more units to reach ₹Y").
- [ ] Build Cart and Checkout flow with UPI options and wallet balance application.
- [ ] Build Orders view, Order Status Timeline, and Pickup Pass (large QR code + 6-digit PIN).
- [ ] Build Savings Dashboard (lifetime savings vs retail benchmarks) and Wallet ledger.
- [ ] Build Issue raising flow (ticket with photo upload and 48h timer).
- [ ] Build Consent management screen (purpose checkboxes, no pre-ticks, one-tap revocation, data export, account deletion).
- [ ] **Verification**: Mobile viewport test (360px), Lighthouse performance check >= 85. Produce `walkthrough.md`.

### Milestone 5: Volunteer Captain & Society Admin Portals
- [ ] Build Captain dashboard with WhatsApp shareable invite link and participation metrics.
- [ ] Build Resident Approval screen for Captain.
- [ ] Build Goods Receipt screen for recording delivered SKU counts and discrepancy flagging.
- [ ] Build Handover Scanner screen (QR camera scan + manual PIN entry).
- [ ] Build printable Per-Flat Packing Slip / distribution sheet.
- [ ] Build Society Admin (RWA) read-only portal: GMV, household participation, society savings, and RWA rebate report.
- [ ] **Verification**: Test Captain goods receipt & QR handover flow. Produce `walkthrough.md`.

### Milestone 6: Supplier Portal & Platform Admin Console
- [ ] Build Supplier portal: Quotes and Slab editor (minQty, supplierPricePaise, validity, lead time).
- [ ] Build Supplier PO dashboard: PO acceptance, dispatch status, and invoice PDF upload.
- [ ] Build Platform Admin Console:
  - Society and Drop Point management.
  - Catalogue management with CSV bulk import and FSSAI validator.
  - Cycle manager with live pooled quantity view and force-lock trigger.
  - Quotes comparison matrix.
  - PO generation preview before sending.
  - Deliveries, short-supply reconciliation, refunds queue, and tickets desk.
  - Retail benchmark prices entry.
  - Audit log viewer with search, filtering, and JSON diffs.
- [ ] Build Public Landing, How It Works, FAQ, and Legal Pages (`TODO_LEGAL`).
- [ ] **Verification**: Verify Admin operations and CSV import. Produce `walkthrough.md`.

### Milestone 7: End-to-End Testing, Security, Polish & Documentation
- [ ] Implement complete Playwright E2E test (`tests/e2e/fullCycle.spec.ts`).
- [ ] Verify cross-society isolation and role-based access control.
- [ ] Verify all money stored as integer paise with no float usage across the codebase.
- [ ] Verify GST tax invoices generation per order with `TODO_LEGAL` placeholders.
- [ ] Run Lighthouse mobile audit to verify >= 85 score.
- [ ] Write comprehensive README.md with setup, env vars, architecture, provider swapping guide, and India deployment instructions.
- [ ] **Verification**: Full test suite green (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`). Produce final `walkthrough.md`.

