# SocietyBuy Statutory & Regulatory Launch Checklist

This document details the statutory licenses, mandatory filings, and regulatory obligations required under Indian law before SocietyBuy commercially launches in any housing society. It also provides a comprehensive inventory of all `TODO_LEGAL` placeholders in the codebase that legal counsel must finalize.

---

## 1. Statutory Licenses & Corporate Filings

### 1.1 Goods and Services Tax (GST)
* **Corporate Entity Registration**: Principal place of business GSTIN in every state of operations (e.g. Karnataka: `29`, Haryana: `06`, Maharashtra: `27`, Delhi: `07`).
* **E-Commerce Operator TCS (Section 52 CGST Act)**: Registration as an Electronic Commerce Operator to collect Tax Collected at Source (TCS) at 1% (0.5% CGST + 0.5% SGST or 1% IGST) on net taxable supplies made through the platform by suppliers.
* **GST Rule 46 Compliant Invoices**: Every resident order must receive an itemized tax invoice containing:
  - Registered Legal Name, Address, and State Code of SocietyBuy.
  - Continuous consecutive 16-character alphanumeric invoice serial number per financial year.
  - Resident flat number and society delivery address.
  - HSN (Harmonized System of Nomenclature) 6-to-8 digit code per SKU line.
  - Pre-tax unit rate, GST percentage (e.g. 0%, 5%, 12%, 18%), CGST/SGST/IGST breakdown, and final GST-inclusive price.
* **Credit Notes (Section 34 CGST Act)**: Auto-generated credit notes for price delta adjustments at cycle lock and short-supply quantity reductions.

### 1.2 Food Safety and Standards Authority of India (FSSAI)
* **Central License for E-Commerce FBO**: Under the *Food Safety and Standards (Licensing and Registration of Food Businesses) Regulations, 2011*, platforms aggregating or facilitating food staple orders must obtain an **E-Commerce Food Business Operator (FBO)** central license.
* **Supplier License Verification**: All participating wholesalers and brand manufacturers must provide a valid 14-digit FSSAI license number. SocietyBuy strictly validates this during SKU creation (`isFood` requires 14-digit FSSAI).
* **Storage & Transit Hygiene**: Society drop points (clubhouses, security rooms) must comply with Schedule 4 hygienic handling standards for ambient shelf-stable groceries.

### 1.3 Legal Metrology (Packaged Commodities) Rules, 2011
Mandatory digital declarations on every SKU display page before the consumer adds to basket:
1. Name and address of the manufacturer / packer / importer.
2. Common generic name of the commodity.
3. Net quantity in standard metric units (kg, g, L, ml).
4. Country of Origin.
5. Best Before / Expiry date indicator.
6. Maximum Retail Price (MRP) in Indian Rupees (₹), inclusive of all taxes.
7. **Strict Rule 10**: Selling price must **never exceed MRP**. The platform engine hard-caps all slab pricing at MRP.

### 1.4 Consumer Protection (E-Commerce) Rules, 2020
* **Nodal Officer & Resident Grievance Officer**:
  - Mandatory appointment of an Indian citizen resident officer.
  - Prominent publication of the officer’s name, designation, email address, physical postal address, and contact number.
* **Statutory Timelines**:
  - **48-Hour Acknowledgement**: Every consumer complaint/ticket must be formally acknowledged within 48 hours of submission.
  - **30-Day Resolution**: Resolution of any consumer grievance within 1 calendar month.
* **Prohibited Practices**:
  - No dark patterns or pre-ticked consent options.
  - No cancellation penalties if the cycle is cancelled or short-supplied.
  - Transparency of tier discounts and clear explanation of guaranteed vs. final pricing.

### 1.5 Digital Personal Data Protection Act (DPDPA), 2023
* **Data Minimization**: SocietyBuy collects only: resident name, phone number, and housing flat number. Card data, UPI PINs, and passwords are never collected or stored.
* **Notice & Consent**: Unbundled, clear, affirmative consent in English and Hindi prior to account activation.
* **Data Principal Rights**:
  - Right to access personal data (fulfilled via the `/profile` JSON export).
  - Right to erasure / account deletion (fulfilled via soft deletion and consent withdrawal).
* **Audit Trail**: State mutations, logins, and profile changes logged to `audit_logs` with PII masking and credential redaction.

### 1.6 Resident Welfare Association (RWA) Drop-Point Agreements
Before launching a cycle in an apartment complex:
* **Drop Point License Agreement**: Formal MoU with the RWA / Apartment Owners Association (AOA) granting permission to use the designated society drop point for unloading wholesale goods.
* **RWA Community Rebate Terms**: Contractual 1–2% quarterly community rebate disbursement terms (paid into society maintenance account).
* **Captain Indemnity**: Clarification of the volunteer Captain’s role as community coordinator rather than commercial delivery agent.

---

## 2. Complete Inventory of `TODO_LEGAL` Placeholders

All placeholders below are marked `TODO_LEGAL` in source code per **Rule 9** (*Never invent legal text*). Legal counsel must provide certified legal text prior to commercial deployment:

| File Location | Line | Component / Field | Purpose / Context |
| :--- | :--- | :--- | :--- |
| `src/app/(public)/terms/page.tsx` | 8 | Statutory Notice | Terms of Service agreement notice |
| `src/app/(public)/terms/page.tsx` | 12 | Corporate Agreement | Binding terms between Company and Residents/Captains |
| `src/app/(public)/terms/page.tsx` | 15 | Pooling Regulations | Minimum orders, guaranteed prices, lock deadlines |
| `src/app/(public)/privacy/page.tsx` | 8 | Statutory Notice | DPDPA statutory privacy notice |
| `src/app/(public)/privacy/page.tsx` | 12 | Data Minimization Policy | Personal data collection scope and storage boundaries |
| `src/app/(public)/privacy/page.tsx` | 15 | Consent Terms | Unbundled consent and withdrawal rights |
| `src/app/(public)/grievance/page.tsx` | 11 | Designated Officer Name | Officer name (`Shri R. K. Nair`) |
| `src/app/(public)/grievance/page.tsx` | 14 | Officer Designation | Official role title |
| `src/app/(public)/grievance/page.tsx` | 17 | Grievance Contact Email | Statutory email (`grievance@societybuy.in`) |
| `src/app/(public)/grievance/page.tsx` | 20 | Office Address | Corporate registered grievance physical address |
| `src/components/common/Footer.tsx` | 18 | Entity Name | Registered entity name (`SocietyBuy Technologies Pvt Ltd`) |
| `src/components/common/Footer.tsx` | 20 | Registered Office | Legal registered office city and state |
| `src/components/common/Footer.tsx` | 22 | Support Email | Official customer care contact |
| `src/components/common/Footer.tsx` | 31, 36, 41 | Footer Links | Terms, Privacy, and Grievance links |
| `src/components/common/Footer.tsx` | 50, 52 | Grievance Card | Officer name and SLA commitments |
| `src/server/domain/taxInvoice.ts` | 136 | HSN Fallback | Default HSN code fallback for unclassified items |
| `src/server/domain/taxInvoice.ts` | 167 | Company Name | Legal company name on tax invoice |
| `src/server/domain/taxInvoice.ts` | 169 | Company Address | Tax invoice registered physical address |
| `src/server/domain/taxInvoice.ts` | 170 | GSTIN | Company 15-character GSTIN (`29AAAAA0000A1Z5`) |
| `src/server/domain/taxInvoice.ts` | 171 | PAN | Company Permanent Account Number (`AAAAA0000A`) |
| `src/server/domain/taxInvoice.ts` | 172 | CIN | Corporate Identity Number (`U72200KA2026PTC000000`) |
| `src/server/domain/taxInvoice.ts` | 173 | FSSAI License | Platform E-Commerce FBO 14-digit license |
| `src/server/domain/taxInvoice.ts` | 174 | Grievance Officer | Tax invoice consumer care contact officer |
| `src/server/domain/taxInvoice.ts` | 175 | Grievance Email | Tax invoice consumer care contact email |
| `src/server/services/consentService.ts` | 132 | Data Export Notice | DPDPA statutory notice header on data export |
| `src/components/resident/ProfileClient.tsx` | 292, 295 | Profile Legal Disclaimer | Terms, DPDPA notice, and Grievance details |
| `src/components/resident/ResidentInvoiceClient.tsx` | 192 | Invoice Footer Note | Statutory notice explaining computer-generated invoice |
| `src/i18n/en.json` | 71 | English Disclaimer | Consumer protection and statutory disclaimer |
| `src/i18n/hi.json` | 71 | Hindi Disclaimer | Consumer protection and statutory disclaimer (Hindi) |

---

## 3. Pre-Launch Verification Workflow

Before deploying the production image:
1. **Legal Review**: Corporate legal counsel signs off on `terms`, `privacy`, `grievance`, and invoice tax fields.
2. **GST Portal Verification**: Verify state GSTINs and active TCS registration on the GST common portal.
3. **FSSAI Portal Verification**: Verify central aggregator license status on FoSCoS portal.
4. **TRAI DLT Whitelist**: Verify Principal Entity registration and approved sender ID (`SOCBUY`).
5. **Bank & Escrow Integration**: Connect verified current account to Razorpay Route / automated payout split.

