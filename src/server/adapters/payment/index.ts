import crypto from "crypto";

export interface CreatePaymentOrderParams {
  orderId: string;
  amountPaise: number;
  customerPhone: string;
  customerName: string;
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  providerOrderId: string;
  amountPaise: number;
  currency: "INR";
  keyId: string;
}

export interface IssueRefundParams {
  providerPaymentId: string;
  amountPaise: number;
  reason: string;
  notes?: Record<string, string>;
}

export interface RefundResult {
  providerRefundId: string;
  amountPaise: number;
  status: "SUCCESS" | "PENDING";
}

export interface IPaymentAdapter {
  createOrder(params: CreatePaymentOrderParams): Promise<PaymentOrderResult>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  issueRefund(params: IssueRefundParams): Promise<RefundResult>;
}

export class MockPaymentAdapter implements IPaymentAdapter {
  private shouldFailNextOrder = false;

  setSimulateFailure(fail: boolean) {
    this.shouldFailNextOrder = fail;
  }

  async createOrder(params: CreatePaymentOrderParams): Promise<PaymentOrderResult> {
    if (this.shouldFailNextOrder) {
      this.shouldFailNextOrder = false;
      throw new Error("MOCK_PAYMENT_FAILURE: Card/UPI network error simulated");
    }

    const mockOrderId = `mock_order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      providerOrderId: mockOrderId,
      amountPaise: params.amountPaise,
      currency: "INR",
      keyId: "rzp_test_mock_societybuy_key",
    };
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature) return false;
    // In mock mode, allow "mock_valid_signature" or compute sha256 HMAC
    if (signature === "mock_valid_signature" || signature === "test_signature") {
      return true;
    }

    try {
      const expectedSignature = crypto
        .createHmac("sha256", secret || "mock_secret")
        .update(payload)
        .digest("hex");
      return signature === expectedSignature;
    } catch {
      return false;
    }
  }

  async issueRefund(params: IssueRefundParams): Promise<RefundResult> {
    return {
      providerRefundId: `mock_rfnd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      amountPaise: params.amountPaise,
      status: "SUCCESS",
    };
  }
}

export class RazorpayPaymentAdapter implements IPaymentAdapter {
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || "";
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  }

  async createOrder(params: CreatePaymentOrderParams): Promise<PaymentOrderResult> {
    // If keys aren't configured, fall back to mock
    if (!this.keyId || !this.keySecret) {
      console.warn("Razorpay keys missing; falling back to mock payment order");
      return new MockPaymentAdapter().createOrder(params);
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amountPaise,
        currency: "INR",
        receipt: params.orderId,
        notes: params.notes,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay order creation failed: ${errorText}`);
    }

    const data = (await response.json()) as { id: string; amount: number };
    return {
      providerOrderId: data.id,
      amountPaise: data.amount,
      currency: "INR",
      keyId: this.keyId,
    };
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
    if (!webhookSecret || !signature) return false;

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");
    return signature === expectedSignature;
  }

  async issueRefund(params: IssueRefundParams): Promise<RefundResult> {
    if (!this.keyId || !this.keySecret) {
      return new MockPaymentAdapter().issueRefund(params);
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${params.providerPaymentId}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amountPaise,
        notes: { reason: params.reason, ...params.notes },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Razorpay refund failed: ${err}`);
    }

    const data = (await response.json()) as { id: string; amount: number; status: string };
    return {
      providerRefundId: data.id,
      amountPaise: data.amount,
      status: data.status === "processed" ? "SUCCESS" : "PENDING",
    };
  }
}

export function getPaymentAdapter(): IPaymentAdapter {
  if (process.env.PAYMENT_ADAPTER === "RAZORPAY" && process.env.RAZORPAY_KEY_ID) {
    return new RazorpayPaymentAdapter();
  }
  return new MockPaymentAdapter();
}

