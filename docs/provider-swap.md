# Production Provider Swap Guide

SocietyBuy follows **Rule 7** of the project architecture:
> *External services (OTP, WhatsApp, Razorpay) sit behind adapter interfaces in `src/server/adapters/*` with a mock implementation selected by env var. Default everything to mock so the app runs with no keys.*

This guide explains how to swap the development mock adapters for live, production-grade Indian SaaS providers (Razorpay, SMS OTP Gateway, and Meta WhatsApp Business API).

---

## Architecture Overview

```
                      ┌────────────────────────┐
                      │    Service Layer       │
                      │ (orderService, etc.)   │
                      └───────────┬────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │   Adapter Interface     │
                     │ (PaymentAdapter, etc.)  │
                     └───────┬─────────┬───────┘
                             │         │
                 (default)   │         │  (env switch)
                             ▼         ▼
                 ┌───────────────┐ ┌────────────────┐
                 │  MockAdapter  │ │ Production SDK │
                 │ (No API keys) │ │ (Live Network) │
                 └───────────────┘ └────────────────┘
```

The app checks environment variables on boot:
```bash
# Provider Selection Flags (Defaults to "mock")
PAYMENT_PROVIDER=mock          # Options: "mock" | "razorpay"
OTP_PROVIDER=mock              # Options: "mock" | "msg91" | "twilio" | "fast2sms"
NOTIFICATION_PROVIDER=mock      # Options: "mock" | "whatsapp_cloud" | "gupshup"
```

---

## 1. Razorpay Payment Gateway Swap

### 1.1 Overview & Requirements
- **Entity**: Razorpay Software Private Limited (India)
- **Currency**: INR strictly stored as integer paise (`amount_in_paise`).
- **Payment Methods Supported**: UPI Intent (GPay, PhonePe, Paytm, BHIM), UPI QR, Netbanking, Rupay/Visa/Mastercard debit and credit cards.
- **Webhook Endpoint**: `POST /api/webhooks/razorpay`

### 1.2 Environment Variables
```env
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy
RAZORPAY_WEBHOOK_SECRET=whsec_zzzzzzzzzzzzzzzzzzzzzzzz
```

### 1.3 Production Implementation (`src/server/adapters/payment/razorpay.ts`)
To activate the live Razorpay SDK, install the official package:
```bash
pnpm add razorpay
pnpm add -D @types/razorpay
```

Create `src/server/adapters/payment/razorpay.ts`:
```typescript
import Razorpay from "razorpay";
import crypto from "crypto";
import { PaymentAdapter, CreatePaymentOrderInput, PaymentOrderResult } from "./types";

export class RazorpayPaymentAdapter implements PaymentAdapter {
  private client: Razorpay;
  private webhookSecret: string;

  constructor() {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    if (!key_id || !key_secret) {
      throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment.");
    }

    this.client = new Razorpay({ key_id, key_secret });
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    const options = {
      amount: input.amountPaise, // e.g. 38000 paise = ₹380.00
      currency: "INR",
      receipt: input.orderId,
      notes: {
        societyId: input.societyId,
        flatId: input.flatId,
        pickupCode: input.pickupCode,
      },
    };

    const order = await this.client.orders.create(options);

    return {
      providerOrderId: order.id,
      amountPaise: Number(order.amount),
      currency: order.currency,
      status: "CREATED",
    };
  }

  async verifySignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<boolean> {
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!);
    hmac.update(`${params.orderId}|${params.paymentId}`);
    const generatedSignature = hmac.digest("hex");
    return generatedSignature === params.signature;
  }

  async processRefund(params: {
    paymentId: string;
    amountPaise: number;
    reason: string;
  }): Promise<{ refundId: string; status: string }> {
    const refund = await this.client.payments.refund(params.paymentId, {
      amount: params.amountPaise,
      notes: { reason: params.reason },
    });

    return {
      refundId: refund.id,
      status: refund.status,
    };
  }
}
```

### 1.4 Webhook Idempotency (Rule 4)
In `src/app/api/webhooks/razorpay/route.ts`:
- Razorpay sends raw payload with `x-razorpay-signature`.
- Signature is verified using HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET`.
- The event id (`event.id`) is stored in `ProviderEvent`. Duplicate deliveries return `HTTP 200 { duplicate: true }` immediately, guaranteeing strict idempotency.

---

## 2. Indian SMS & OTP Provider Swap

Under Telecom Regulatory Authority of India (TRAI) regulations, commercial SMS delivery in India requires **Distributed Ledger Technology (DLT)** registration.

### 2.1 Regulatory DLT Prerequisites
1. **Principal Entity (PE) Registration**: Register on any telecom DLT portal (e.g. Jio DLT, Vilpower, Airtel DLT).
2. **Sender ID / Header Approval**: 6-character alphabetic sender header (e.g. `SOCBUY` or `SCYBUY`).
3. **Template Approval**: Content templates with mandatory registered variable syntax:
   - *DLT Template*: `{#var#} is your verification OTP for SocietyBuy login. Valid for 10 minutes. Do not share this OTP with anyone. - SocietyBuy`
   - *Registered Template ID*: `1407161234567890123`

### 2.2 Environment Variables (Example: MSG91)
```env
OTP_PROVIDER=msg91
MSG91_AUTH_KEY=xxxxxxxxxxxxxxxxxxxx
MSG91_TEMPLATE_ID=1407161234567890123
MSG91_SENDER_ID=SOCBUY
```

### 2.3 Production Implementation (`src/server/adapters/otp/msg91.ts`)
```typescript
import { OtpAdapter, SendOtpResult, VerifyOtpResult } from "./types";

export class Msg91OtpAdapter implements OtpAdapter {
  private authKey: string;
  private templateId: string;
  private senderId: string;

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY || "";
    this.templateId = process.env.MSG91_TEMPLATE_ID || "";
    this.senderId = process.env.MSG91_SENDER_ID || "SOCBUY";
  }

  async sendOtp(phone: string): Promise<SendOtpResult> {
    const formattedPhone = phone.startsWith("91") ? phone : `91${phone}`;

    // MSG91 Send OTP API endpoint
    const url = `https://control.msg91.com/api/v5/otp?template_id=${this.templateId}&mobile=${formattedPhone}&authkey=${this.authKey}&sender=${this.senderId}&otp_length=6&otp_expiry=10`;

    const response = await fetch(url, { method: "POST" });
    const data = await response.json();

    if (data.type !== "success") {
      throw new Error(`Failed to dispatch OTP: ${data.message}`);
    }

    return {
      success: true,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    };
  }

  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
    const formattedPhone = phone.startsWith("91") ? phone : `91${phone}`;

    const url = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${formattedPhone}&authkey=${this.authKey}`;

    const response = await fetch(url, { method: "POST" });
    const data = await response.json();

    return {
      valid: data.type === "success",
      message: data.message,
    };
  }
}
```

---

## 3. WhatsApp Business API Provider Swap

SocietyBuy uses WhatsApp to deliver transactional updates directly to resident households: cycle opening notices, volume tier unlock announcements, lock countdowns, and pickup QR pass notifications.

### 3.1 Meta Cloud API Prerequisites
1. Meta Business Manager verified account.
2. WhatsApp Business Account (WABA) with phone number registered.
3. Pre-approved **Highly Structured Message (HSM)** templates:
   - `cycle_opened_v1` (Marketing / Utility)
   - `volume_tier_unlocked_v1` (Utility)
   - `order_pickup_ready_v1` (Utility: contains pickup PIN and collection timing)
   - `refund_wallet_credited_v1` (Utility: price delta breakdown)

### 3.2 Environment Variables (Meta Cloud API)
```env
NOTIFICATION_PROVIDER=whatsapp_cloud
WHATSAPP_API_TOKEN=EAAKxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=109876543210987
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
```

### 3.3 Production Implementation (`src/server/adapters/notification/whatsappCloud.ts`)
```typescript
import { NotificationAdapter, SendNotificationInput, NotificationResult } from "./types";

export class WhatsAppCloudAdapter implements NotificationAdapter {
  private apiToken: string;
  private phoneNumberId: string;

  constructor() {
    this.apiToken = process.env.WHATSAPP_API_TOKEN || "";
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  }

  async send(input: SendNotificationInput): Promise<NotificationResult> {
    const recipientPhone = input.recipientPhone.startsWith("91")
      ? input.recipientPhone
      : `91${input.recipientPhone}`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "template",
      template: {
        name: input.templateName || "utility_transactional_notification",
        language: { code: input.language || "en" },
        components: [
          {
            type: "body",
            parameters: (input.templateParams || []).map((val) => ({
              type: "text",
              text: String(val),
            })),
          },
        ],
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
    }

    return {
      messageId: result.messages?.[0]?.id || `wamid.${Date.now()}`,
      status: "SENT",
      channel: "WHATSAPP",
    };
  }
}
```

---

## 4. Testing Your Production Integration

Before going live with real customers:
1. Set `PAYMENT_PROVIDER=razorpay` with `rzp_test_...` keys. Place a ₹1.00 test order and verify webhook receipt in test logs.
2. Set `OTP_PROVIDER=msg91` with test phone numbers whitelisted on your DLT portal. Verify 6-digit OTP SMS arrives within 5 seconds.
3. Set `NOTIFICATION_PROVIDER=whatsapp_cloud` with Meta Test Phone Number. Verify template message renders with dynamic variables on your personal WhatsApp.
4. Verify that running `pnpm test` and `pnpm test:e2e` continues to pass in mock mode with zero API keys set.

