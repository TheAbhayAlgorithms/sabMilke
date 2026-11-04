# SocietyBuy - Hyper-Local Wholesale Group-Buying Platform

> **SocietyBuy** is a production-grade, hyper-local group-buying Progressive Web App (PWA) built for Indian housing societies and apartment complexes. Residents pool monthly orders for shelf-stable staples (atta, rice, edible oils, pulses, tea, spices, and cleaning supplies) at wholesale slab prices. When the monthly cycle locks, the system automatically selects the cheapest supplier quote, unlocks volume tier discounts, delivers once to the society drop point, and refunds the price difference straight into resident wallets.

---

## Table of Contents
1. [What is SocietyBuy? (Simple Plain-Language Overview)](#1-what-is-societybuy-simple-plain-language-overview)
2. [Complete Beginner's Guide: How to Use the App](#2-complete-beginners-guide-how-to-use-the-app)
   - [2.1 Logging In (No Password Needed)](#21-logging-in-no-password-needed)
   - [2.2 Joining Your Society Complex & Flat](#22-joining-your-society-complex--flat)
   - [2.3 Browsing the Catalogue & The Discount Ladder](#23-browsing-the-catalogue--the-discount-ladder)
   - [2.4 Adding to Cart & UPI Checkout](#24-adding-to-cart--upi-checkout)
   - [2.5 Tracking the Cycle & Earning Price Drop Refunds](#25-tracking-the-cycle--earning-price-drop-refunds)
   - [2.6 Collecting Your Groceries with the QR Pickup Pass](#26-collecting-your-groceries-with-the-qr-pickup-pass)
   - [2.7 Reporting Damaged or Missing Items (48h Grievance Desk)](#27-reporting-damaged-or-missing-items-48h-grievance-desk)
   - [2.8 Volunteer Captain's Guide](#28-volunteer-captains-guide)
   - [2.9 Society Admin (RWA Committee) Guide](#29-society-admin-rwa-committee-guide)
   - [2.10 Wholesale Supplier Portal Guide](#210-wholesale-supplier-portal-guide)
   - [2.11 Platform Administrator Console Guide](#211-platform-administrator-console-guide)
   - [2.12 Switching Languages (English & हिंदी)](#212-switching-languages-english--हिंदी)
3. [System Architecture, Data & Workflow](#3-system-architecture-data--workflow)
   - [3.1 End-to-End Lifecycle Workflow](#31-end-to-end-lifecycle-workflow)
   - [3.2 The Dynamic Pricing Engine & Slabs](#32-the-dynamic-pricing-engine--slabs)
   - [3.3 Cycle State Machine](#33-cycle-state-machine)
   - [3.4 Goods Receipt, Shortage Refunds & Distribution](#34-goods-receipt-shortage-refunds--distribution)
   - [3.5 Multi-Tenant Scoping & Security Hardening](#35-multi-tenant-scoping--security-hardening)
   - [3.6 Financial Integrity & Integer Paise Model](#36-financial-integrity--integer-paise-model)
4. [Quick Start & Local Setup](#4-quick-start--local-setup)
5. [Demo Accounts & Roles](#5-demo-accounts--roles)
6. [Testing & Verification Suites](#6-testing--verification-suites)
7. [Statutory Compliance & Production Guides](#7-statutory-compliance--production-guides)

---

## 1. What is SocietyBuy? (Simple Plain-Language Overview)

Most Indian urban households in gated societies purchase monthly groceries through instant delivery apps (Blinkit, Zepto, Instamart) or retail supermarkets. While convenient for emergencies, buying heavy monthly staples (a 10kg bag of atta, 5L tin of mustard oil, 5kg toor dal, 10kg basmati rice) individually means paying **full retail price (MRP)** plus convenience and packaging markups.

Meanwhile, commercial wholesale mandis sell these identical brands at **20% to 35% discounts**—but only if you purchase 50 or 100 units at a time.

```
Individual Resident Buying:
  Resident A (Flat 101)  ──────> Retail Supermarket (Pays 100% MRP + delivery fees)
  Resident B (Flat 204)  ──────> Quick Commerce App (Pays 100% MRP + surge charges)
  Resident C (Flat 502)  ──────> Local Kirana Store (Pays 100% MRP)

SocietyBuy Group-Buying:
  Flat 101 (20kg Atta) ┐
  Flat 204 (10kg Atta) ├─► Pooled Demand ──► Wholesale Sourcing ──► Single Society Drop
  Flat 502 (30kg Atta) ┘   (600kg Total)     (Tier 3 Wholesale)     (Clubhouse Dock)
                                                    │
                                                    ▼
                             Each family saves ₹350 - ₹1,200/month!
```

**SocietyBuy brings wholesale mandi prices to your apartment gates:**
1. **Demand Pooling**: You and your neighbors order your monthly groceries together during an active monthly "Cycle".
2. **Discount Ladder**: The more packets your society orders collectively, the cheaper the price becomes for everyone.
3. **Price Drop Guarantee**: You pay an upfront guaranteed price when ordering. When the pool locks, the system finds the lowest wholesale price reached, and automatically **refunds the extra money directly to your SocietyBuy wallet**!
4. **Single Society Drop**: A wholesale delivery truck brings all goods directly to your society's designated drop point (e.g. Clubhouse or Basement-1 Loading Bay).
5. **Quick QR Pickup**: You collect your neatly bagged order by showing a 6-digit PIN or digital QR pass on your phone to your friendly neighbor volunteer (the Society Captain).

---

## 2. Complete Beginner's Guide: How to Use the App

*This section is written for residents, senior citizens, and first-time digital shoppers. No technical knowledge is required!*

### 2.1 Logging In (No Password Needed)
SocietyBuy does not require you to remember complicated passwords. You log in using your 10-digit mobile number:

1. Open SocietyBuy on your mobile browser (or install it as an app on your home screen).
2. Enter your **10-digit Indian mobile phone number**.
3. Tap the green **Send OTP** button.
4. You will receive a 6-digit SMS code on your phone.
5. Enter the code and tap **Verify & Login**.

> [!TIP]
> **Demo / Testing Mode:** If you are running SocietyBuy locally in demonstration mode, you can use the test OTP `123456` for any mobile number. You can also tap the **"Seed Users Quick Login"** panel on the login page to sign in instantly as a Resident, Captain, RWA Committee Member, Supplier, or Admin with a single click.

---

### 2.2 Joining Your Society Complex & Flat
Once logged in, you link your account to your housing complex:

1. Tap **Join Society** on the top menu or follow the link shared on your apartment WhatsApp group.
2. Enter your building's **6-character Society Join Code** (for example, `GGH100` for Green Glen Heights).
3. The screen will display your society name, address, and the designated goods drop location (e.g. *Clubhouse Loading Dock, Gate 1*).
4. Tap the **Select Your Flat** dropdown and choose your Tower and Flat number (e.g. *Tower A - Flat 101*).
5. Tap **Confirm & Join Society**.

> [!NOTE]
> **One Order Per Flat Rule:** To ensure fair distribution and clean logistics, each apartment unit can place **one active order per monthly cycle**. Family members in the same flat share the basket.

---

### 2.3 Browsing the Catalogue & The Discount Ladder
Tap **Catalogue** in the bottom navigation bar to see available wholesale groceries:

- **Browse Categories**: Filter by Atta & Flours, Rice & Grains, Edible Oils, Dals & Pulses, Spices, Beverages, Cleaning, and Household.
- **Compare Savings**: Each item displays its Maximum Retail Price (**MRP**), our **Guaranteed Join Price**, and your immediate savings.
- **FSSAI Food Safety Badge**: Every food item shows a verified 14-digit government food safety license number for complete peace of mind.
- **The Tier Ladder**: Tap any product to view its live volume discount ladder:
  - *Tier 1 (Base Wholesale)*: 1–24 units ordered across society ➔ ₹380 / 10kg
  - *Tier 2 (Bulk Discount)*: 25–49 units ordered across society ➔ ₹360 / 10kg
  - *Tier 3 (Super Wholesale)*: 50+ units ordered across society ➔ ₹335 / 10kg
  - The screen clearly shows: *"Only 11 more units needed across the society to unlock Tier 3!"*

---

### 2.4 Adding to Cart & UPI Checkout
1. Choose the quantity you need for your family's monthly stock (e.g. 2 bags of Aashirvaad Shudh Chakki Atta, 1 can of Fortune Mustard Oil).
2. Tap **Add to Basket**.
3. Tap the **Cart** icon at the top right to review your items, subtotal, and total estimated savings.
4. **Use Wallet Balance**: If you received price drop refunds or referral credits from previous months, check the box to apply your wallet balance and reduce your cash payment.
5. Tap **Proceed to Checkout**.
6. Select your payment method:
   - **UPI Intent / Apps**: Opens Google Pay, PhonePe, Paytm, or BHIM directly on your phone.
   - **UPI QR Code**: Displays a dynamic QR code you can scan with any banking app.
   - **Debit / Credit Card / Netbanking**: Standard secure bank checkout.
7. Complete your payment. You will immediately see your official order confirmation!

---

### 2.5 Tracking the Cycle & Earning Price Drop Refunds
After placing your order, you do not need to do anything—your society works together to increase your savings:

1. Tap **Orders** to see your active order and live status timeline.
2. Watch the **Cycle Countdown Timer**: You will see how many hours remain before the monthly pool locks.
3. **The Price Drop Refund**:
   - Suppose you paid the Tier 1 price of ₹380 for atta at join time.
   - By the deadline, your neighbors ordered 65 bags, reaching the Tier 3 price of ₹335.
   - The platform locks the cycle, calculates the ₹45/bag price difference, and **automatically deposits ₹90 (for your 2 bags) into your SocietyBuy Wallet**!
   - You receive an instant WhatsApp alert confirming your refund. You can spend this wallet balance on next month's groceries!

---

### 2.6 Collecting Your Groceries with the QR Pickup Pass
When the wholesale truck delivers to your building:

1. You receive a notification: *"Your SocietyBuy order has arrived at the Clubhouse!"*
2. Open SocietyBuy and tap your order.
3. You will see your **Official Society Pickup Pass**:
   - A large, high-contrast **6-digit Pickup PIN** (e.g. `481-902`).
   - A scannable **QR Code**.
   - An itemized packing list showing your ordered items.
4. Walk down to your society drop point.
5. Show the QR code or read out the 6-digit PIN to the volunteer Captain.
6. The Captain checks your items, hands over your bags, and taps Confirm.
7. **Partial Collection**: If you ordered 80kg of supplies and cannot carry everything in one trip, the Captain can mark 3 boxes collected now, and you can return later with your trolley for the remaining items!

---

### 2.7 Reporting Damaged or Missing Items (48h Grievance Desk)
We guarantee the quality of every product delivered:

1. If a bag was torn in transit, or a packet was missing, open your order page within **24 hours of collection**.
2. Tap **Need Help? Raise an Issue**.
3. Select the category (*Damaged Pack*, *Missing Item*, *Quality Issue*, or *Other*).
4. Type a short description and snap a photo using your phone camera.
5. Tap **Submit Issue Ticket**.
6. **Statutory 48-Hour Guarantee**: Under Indian Consumer Protection regulations, our designated Grievance Officer will formally acknowledge your issue within 48 hours.
7. Once verified, an instant refund is credited directly to your wallet, and an official GST Credit Note is issued to your account.

---

### 2.8 Volunteer Captain's Guide
The Society Captain is an apartment resident volunteer who coordinates community savings:

1. **Share Invite Link**: Open the Captain Hub (`/captain/participation`) and tap **Share to WhatsApp**. An invite message with your society's join code is generated for your apartment tower groups.
2. **Participation Dashboard**: View how many flats have ordered, how many are pending, and total society wholesale GMV.
3. **Receiving Delivery**: When the wholesale truck arrives, open `/captain/goods-receipt`. Check off the delivered carton quantities against the invoice. If a supplier delivered 48 bottles of oil instead of 50, record the shortage: the system automatically refunds the affected families immediately!
4. **Print Packing Lists**: Tap **Print Packing List** (`/captain/packing-list`) to get a neatly formatted sheet organized by Tower and Flat number to separate boxes into apartment piles.
5. **Handover Scanner**: Open `/captain/handover`. Type the resident's 6-digit PIN or scan their phone QR code to complete the handover.

---

### 2.9 Society Admin (RWA Committee) Guide
For Apartment Owners Associations (AOA) and Resident Welfare Committees (RWA):

1. Log in with your society admin account and open `/society-admin`.
2. **Community Savings Tracker**: View total money saved by your complex's residents compared to commercial retail prices.
3. **2% RWA Community Development Rebate**: SocietyBuy automatically allocates **2% of the society's total monthly grocery pool spend** back to your RWA maintenance bank account. This provides your association with an ongoing community fund for society gardens, clubhouses, or festive celebrations!

---

### 2.10 Wholesale Supplier Portal Guide
For registered distributors and wholesale suppliers:

1. Log in to the Supplier Portal at `/supplier`.
2. **Quote & Slab Manager** (`/supplier/quotes`): Submit wholesale pricing per SKU across volume slabs (e.g. 1–24 units, 25–49 units, 50+ units). Specify Minimum Order Quantity (MOQ), validity dates, and lead time in days.
3. **Purchase Orders** (`/supplier/purchase-orders`): When cycles lock, winning quotes receive official Purchase Orders (`PO-2026-...`).
4. **Accept & Dispatch**: Tap Confirm to accept the PO, upload your GST Tax Invoice (PDF), and mark the shipment as Dispatched with tracking details.

---

### 2.11 Platform Administrator Console Guide
For SocietyBuy operations staff:

1. Access `/admin` using your Platform Administrator credentials.
2. **Catalogue Manager** (`/admin/catalogue`): Add SKUs, enforce 14-digit FSSAI licenses on food, configure platform profit margins (percentage + minimum paise), and import thousands of products via bulk CSV upload with row-by-row error reporting.
3. **Cycle Manager** (`/admin/cycles`): Create new monthly cycles for societies, inspect live pooled demand, force-lock cycles, or trigger automated supplier selection.
4. **Benchmark Price Manager** (`/admin/benchmarks`): Enter competitor benchmark prices (Zepto, Blinkit, Local Kirana) to verify customer savings.
5. **Grievance Desk** (`/admin/tickets`): Track 48-hour statutory acknowledgement timers, communicate with residents, and authorize wallet refunds.
6. **Analytics Console** (`/admin/analytics`): Monitor platform GMV, overall household participation, supplier fulfillment rates, refund rates, and society contributions.

---

### 2.12 Switching Languages (English & हिंदी)
SocietyBuy is built with accessibility in mind:

- Tap the **Language Selector** button in the header bar at any time.
- Switch seamlessly between **English** and **हिंदी (Hindi)**.
- Every button, tier ladder, notification, error screen, and checkout step updates instantly with natural, respectful Hindi phrasing.

---

## 3. System Architecture, Data & Workflow

```
                                      SOCIETYBUY PLATFORM WORKFLOW
                                      
    +-------------------------------------------------------------------------------------------------+
    |                                   1. DEMAND POOLING PHASE                                       |
    |                                                                                                 |
    |  Wholesale Suppliers             Residents in Housing Society                   Cycle Engine    |
    |  [Submit Slabs & MOQs]          [Add staples to monthly basket]              [Aggregates Units] |
    |           │                                    │                                      │         |
    |           ▼                                    ▼                                      ▼         |
    |   Slab 1: 1-24 @ Rs 380              Flat 101: 2x Atta, 1x Oil                Live Tier Ladder: |
    |   Slab 2: 25-49 @ Rs 360             Flat 204: 3x Atta, 2x Dal                "14 more units to |
    |   Slab 3: 50+ @ Rs 335               Flat 305: 1x Atta, 1x Oil                 unlock Tier 3!"  |
    |                                                │                                                |
    |                                  (Pays Guaranteed Price via UPI)                                |
    +------------------------------------------------┬------------------------------------------------+
                                                     │
                                                     ▼ Locks at deadline (e.g. 25th of month)
    +-------------------------------------------------------------------------------------------------+
    |                                   2. CYCLE LOCK & PRICING ENGINE                                |
    |                                                                                                 |
    |    Pooled Quantity Reached: 65 units (Tier 3 Unlocked!)                                         |
    |    Winning Quote: Apex Agro Wholesale @ Rs 335 (Lowest price + MOQ satisfied + Highest Rating)  |
    |    Price Delta: Guaranteed (Rs 380) - Final (Rs 335) = Rs 45/unit                               |
    |                                                                                                 |
    |    Action 1: Rs 45/unit refunded to Resident Wallets automatically (Audit Log written)          |
    |    Action 2: Purchase Order PO-2026-GGH-01 generated and sent to winning supplier               |
    +------------------------------------------------┬------------------------------------------------+
                                                     │
                                                     ▼ Supplier accepts PO & dispatches truck
    +-------------------------------------------------------------------------------------------------+
    |                             3. SOCIETY DROP & GOODS RECEIPT PHASE                               |
    |                                                                                                 |
    |    Delivery Truck arrives at Society Drop Point (Clubhouse Dock)                                |
    |    Captain inspects shipment:                                                                   |
    |      - If expected 65 units, received 65 units ➔ Goods Receipt Confirmed                        |
    |      - If shortage detected (received 63 units) ➔ Auto-refund 2 units to affected flats (FIFO)  |
    |                                                                                                 |
    |    System generates Per-Flat Bagging Sheet (grouped by Tower & Flat)                            |
    +------------------------------------------------┬------------------------------------------------+
                                                     │
                                                     ▼ Goods sorted into flat piles
    +-------------------------------------------------------------------------------------------------+
    |                                  4. HANDOVER & DISTRIBUTION PHASE                               |
    |                                                                                                 |
    |    Residents receive WhatsApp alert: "Your groceries are ready for collection!"                 |
    |    Resident walks to Clubhouse with 6-digit PIN / QR Pass                                       |
    |    Captain scans QR code or enters PIN ➔ Marks Handover Complete                                |
    |    Resident receives statutory GST Tax Invoice (with HSN, CGST, SGST breakup)                   |
    +------------------------------------------------┬------------------------------------------------+
                                                     │
                                                     ▼ Post-delivery care
    +-------------------------------------------------------------------------------------------------+
    |                              5. GRIEVANCE & COMMUNITY REBATE PHASE                              |
    |                                                                                                 |
    |    Resident Ticket (24h window) ➔ 48h Ack SLA ➔ Resolution with Wallet Refund & Credit Note     |
    |    RWA 2% Community Development Rebate ➔ Transferred to apartment maintenance account           |
    +-------------------------------------------------------------------------------------------------+
```

---

### 3.1 End-to-End Lifecycle Workflow
The table below details what happens at every step of the SocietyBuy cycle:

| Phase | Actor | Action Taken | Data Mutation & Rules |
| :--- | :--- | :--- | :--- |
| **1. Quote Submission** | Supplier | Enters volume price slabs, MOQ, validity, and lead times. | Validates non-overlapping slabs. **Rule 10**: Price never above MRP. |
| **2. Cycle Open** | Admin / Cron | Opens monthly pool for an apartment complex. | Checks food SKUs have 14-digit FSSAI numbers. Sets lock deadline. |
| **3. Resident Order** | Resident | Selects flat, adds staples, pays guaranteed price via UPI. | **Rule 1**: Money in integer paise. **Rule 5**: Flat scoped to society. |
| **4. Cycle Lock** | Automated Job | Locks cycle when deadline expires; checks society minimums. | If society minimums not met ➔ auto-refunds all orders and cancels. |
| **5. Sourcing & Refunds** | Pricing Engine | Selects winning quotes; recomputes final prices at slab reached. | Credits price drop delta (`guaranteedPrice - finalPrice`) to resident wallets. |
| **6. PO Generation** | System | Bundles winning items into supplier Purchase Orders. | Moves cycle to `PO_SENT`; orders move to `ALLOCATED`. Generates PO numbers. |
| **7. Dispatch** | Supplier | Confirms PO, uploads tax invoice, marks dispatched. | Changes PO status to `DISPATCHED`; transit timestamp recorded. |
| **8. Goods Receipt** | Captain | Inspects physical delivery at clubhouse drop point. | Shortages auto-credit resident wallets via FIFO allocation; issues credit notes. |
| **9. Bagging List** | Captain | Prints per-flat packing list with items and checkboxes. | Displays net deliverable quantities adjusting for shortages. |
| **10. Handover** | Resident & Captain | Resident shows 6-digit PIN or QR pass; Captain confirms. | Order marked `HANDED_OVER`; logs handover event in `audit_logs`. |
| **11. Invoicing** | System | Generates compliant resident tax invoice and credit notes. | Computes taxable value, CGST, SGST, IGST from GST-inclusive paise. |
| **12. Grievance Desk** | Resident & Officer | Issue raised within 24h of collection; 48h SLA timer begins. | Formal acknowledgement freezes timer; resolution approves wallet refund. |
| **13. RWA Rebate** | System | Computes 2% community development rebate on total GMV. | Calculates `Math.round(gmvPaise * 0.02)` for society maintenance fund. |

---

### 3.2 The Dynamic Pricing Engine & Slabs

SocietyBuy uses a pure domain pricing engine located in [`src/server/domain/pricing.ts`](file:///Users/abhayrajsingh/Documents/Antigravity/societybuy/src/server/domain/pricing.ts):

$$\text{Guaranteed Price} = \min\left(\text{Tier 1 Supplier Price} + \text{Platform Margin}, \text{MRP}\right)$$

$$\text{Final Price at Lock} = \min\left(\text{Reached Slab Supplier Price} + \text{Platform Margin}, \text{Guaranteed Price}, \text{MRP}\right)$$

$$\text{Refund Delta per Unit} = \text{Guaranteed Price} - \text{Final Price at Lock}$$

- **MRP Cap (Rule 10)**: The selling price can **never** exceed Maximum Retail Price under any circumstances.
- **Refund Guarantee**: The final price can **never** exceed the guaranteed price paid by the resident at join time. If fewer neighbors participate than expected, the resident never pays a single rupee more.

---

### 3.3 Cycle State Machine
The cycle lifecycle follows a strictly verified state machine in [`src/server/domain/cycleStateMachine.ts`](file:///Users/abhayrajsingh/Documents/Antigravity/societybuy/src/server/domain/cycleStateMachine.ts):

```
 [DRAFT] ───► [OPEN] ───► [LOCKED] ───► [PO_SENT] ───► [RECEIVED] ───► [DISTRIBUTING] ───► [CLOSED]
                │                          │
                ▼                          ▼
          [CANCELLED]                  [PARTIAL]
    (Society min not met;       (Short supply detected;
     auto-refund all orders)     refund affected lines)
```

- Invalid transitions throw `CycleStateTransitionError`.
- Any state can transition to `DISPUTED` by platform administrator override.

---

### 3.4 Goods Receipt, Shortage Refunds & Distribution
When goods arrive at the society drop point:
1. **Physical Inspection**: The Captain counts incoming cartons.
2. **Automated Shortage Handling (`src/server/domain/procurement.ts`)**: If a shortage occurs, the shortage allocation engine distributes the missing units across order items on a First-In, First-Out (FIFO) basis.
3. **Instant Wallet Credit**: Affected residents immediately receive a `SHORT_SUPPLY_REFUND` in integer paise in their wallets, accompanied by an official GST Credit Note.
4. **Clean Packing List**: The generated distribution sheet reflects only net deliverable items, preventing confusion during pickup.

---

### 3.5 Multi-Tenant Scoping & Security Hardening
SocietyBuy enforces multi-tenant society isolation across all operations:

- **Society Data Isolation (Rule 5)**: Queries for cycles, flats, orders, goods receipts, and analytics are scoped strictly by `societyId` and user `role`. Cross-society data access attempts are blocked with HTTP `403 Forbidden`.
- **Sliding-Window Rate Limiting (`rateLimiter.ts`)**: Protects OTP generation and login verification from credential stuffing and SMS pumping (max 5 requests/minute).
- **CSRF Protection (`csrf.ts`)**: Verifies matching Host and Origin headers on all mutation requests.
- **Data Protection & PII Masking (`masking.ts`)**: Sensitive phone numbers (`98******10`), emails (`j***e@example.com`), and OTP codes are redacted in application logs. Audit payloads are recursively scrubbed of tokens, secrets, and auth headers.
- **Webhook Idempotency (Rule 4)**: Payment webhooks verify HMAC SHA-256 signatures and log event IDs in `ProviderEvent`. Duplicate replays are identified and ignored with zero double-crediting.

---

### 3.6 Financial Integrity & Integer Paise Model
- **Rule 1 Enforcement**: Floating-point numbers are strictly forbidden for currency.
- All monetary amounts (MRP, supplier price, platform margin, guaranteed price, final price, wallet balances, transaction amounts, and RWA rebates) are stored as integer paise (`Int` in PostgreSQL, where ₹1.00 = 100 paise).
- All customer-facing displays format currency using the single helper [`formatINR(paise)`](file:///Users/abhayrajsingh/Documents/Antigravity/societybuy/src/lib/money.ts), following Indian numbering convention (e.g. `₹1,23,456`).

---

## 4. Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.0.0+ (tested on Node v20 and v26)
- **Database**: PostgreSQL 14+ running locally on port `5432`
- **Package Manager**: `pnpm` (v10+ or v12+)

### Step-by-Step Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/societybuy.git
cd societybuy

# 2. Install dependencies with pnpm
pnpm install

# 3. Setup environment variables
cp .env.example .env
# Verify your local PostgreSQL connection string:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/societybuy?schema=public"

# 4. Synchronize Prisma schema to your database
pnpm prisma db push

# 5. Populate seed dataset (demo society, 100 flats, 30 residents, 25 SKUs with slabs, sample orders & tickets)
pnpm seed

# 6. Start the Next.js App Router development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) on your desktop or mobile browser.

---

## 5. Demo Accounts & Roles

All demo accounts use the standard test OTP **`123456`**. You can also tap the **"Seed Users Quick Login"** card on `/login` to sign in instantly:

| Role | Name | Phone Number | Context / Responsibility |
| :--- | :--- | :--- | :--- |
| **Resident** | Aarav Sharma | `9876543211` | Flat A-101, Green Glen Heights. Places monthly grocery orders. |
| **Society Captain** | Vikram Sharma | `9876543210` | Flat A-402, Green Glen Heights. Coordinates receiving & QR handovers. |
| **Society Admin (RWA)** | Ramesh Gupta | `9876543299` | Flat B-201, RWA Management Committee. Tracks community savings & 2% rebate. |
| **Wholesale Supplier** | Apex Agro Wholesale Rep | `9876543301` | Apex Agro Wholesalers. Submits quote slabs and dispatches purchase orders. |
| **Platform Admin** | Ananya Roy | `9876543200` | Platform Console. Manages catalogue, cycles, retail benchmarks & grievance desk. |

---

## 6. Testing & Verification Suites

SocietyBuy maintains high automated test coverage in accordance with **Rule 11**:

```bash
# 1. Run TypeScript strict typecheck (0 errors)
pnpm typecheck

# 2. Run Next.js ESLint static analysis (0 errors)
pnpm lint

# 3. Run Vitest Unit & Domain Test Suite (124 tests across 24 test files)
pnpm test

# 4. Run Playwright End-to-End Suite (42 tests across Mobile Chrome and Desktop Chrome)
pnpm test:e2e

# 5. Reset and reseed the database anytime
pnpm reset && pnpm seed
```

---

## 7. Statutory Compliance & Production Guides

- **[`docs/provider-swap.md`](file:///Users/abhayrajsingh/Documents/Antigravity/societybuy/docs/provider-swap.md)**: Detailed technical instructions to replace development mock adapters with live Indian SaaS services:
  - **Razorpay**: API credentials, webhook verification, UPI Intent, UPI QR, and automated refund APIs.
  - **Indian SMS Gateways (MSG91 / Fast2SMS)**: Telecom Regulatory Authority of India (TRAI) Distributed Ledger Technology (DLT) Principal Entity registration, approved sender headers (`SOCBUY`), and registered message templates.
  - **Meta WhatsApp Cloud API**: High-Structured Message (HSM) template setup for cycle announcements, volume tier alerts, and pickup PIN passes.
- **[`docs/compliance-checklist.md`](file:///Users/abhayrajsingh/Documents/Antigravity/societybuy/docs/compliance-checklist.md)**: Complete regulatory clearance guide under Indian law:
  - GST E-Commerce Operator TCS (Section 52 CGST Act).
  - FSSAI Central Aggregator License under Food Safety & Standards Regulations, 2011.
  - Consumer Protection (E-Commerce) Rules 2020: 48h grievance acknowledgement SLA, 30-day ticket resolution, and Nodal Officer appointment.
  - Digital Personal Data Protection Act (DPDPA), 2023: Purpose specification, unbundled consent without pre-ticks, right to access, and right to erasure.
  - Legal Metrology (Packaged Commodities) Rules, 2011: Mandatory e-commerce declarations and MRP ceilings.
  - Complete inventory of all `TODO_LEGAL` markers across the codebase.
