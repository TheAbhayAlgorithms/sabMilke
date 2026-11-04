import { describe, it, expect } from "vitest";
import { MockOtpAdapter } from "@/server/adapters/otp";
import { MockPaymentAdapter } from "@/server/adapters/payment";
import { MockNotificationAdapter } from "@/server/adapters/notification";
import { prisma } from "@/server/db/client";

describe("External Adapters & Mocks (Rule 7)", () => {
  it("MockOtpAdapter sends and verifies OTP", async () => {
    const adapter = new MockOtpAdapter();
    const result = await adapter.sendOtp("9876543210", "456789");
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();

    // Verification
    expect(adapter.verifyOtp("9876543210", "456789", "456789")).toBe(true);
    // Universal demo OTP
    expect(adapter.verifyOtp("9876543210", "123456", "456789")).toBe(true);
    // Invalid OTP
    expect(adapter.verifyOtp("9876543210", "000000", "456789")).toBe(false);
  });

  it("MockPaymentAdapter creates orders and verifies signatures", async () => {
    const adapter = new MockPaymentAdapter();
    const order = await adapter.createOrder({
      orderId: "ord_123",
      amountPaise: 50000,
      customerName: "Test User",
      customerPhone: "9876543210",
    });

    expect(order.amountPaise).toBe(50000);
    expect(order.currency).toBe("INR");
    expect(order.providerOrderId).toContain("mock_order_");

    // Webhook signature verification
    expect(adapter.verifyWebhookSignature("{}", "mock_valid_signature", "secret")).toBe(true);
    expect(adapter.verifyWebhookSignature("{}", "invalid_sig", "secret")).toBe(false);

    // Refund
    const refund = await adapter.issueRefund({
      providerPaymentId: "pay_123",
      amountPaise: 50000,
      reason: "SHORT_SUPPLY",
    });
    expect(refund.status).toBe("SUCCESS");
    expect(refund.providerRefundId).toBeDefined();
  });

  it("MockPaymentAdapter simulates failure when configured", async () => {
    const adapter = new MockPaymentAdapter();
    adapter.setSimulateFailure(true);

    await expect(
      adapter.createOrder({
        orderId: "ord_err",
        amountPaise: 10000,
        customerName: "Err",
        customerPhone: "9876543210",
      })
    ).rejects.toThrow("MOCK_PAYMENT_FAILURE");
  });

  it("MockNotificationAdapter creates notification record", async () => {
    const user = await prisma.user.findFirst();
    if (!user) return;

    const adapter = new MockNotificationAdapter();
    const result = await adapter.send({
      userId: user.id,
      channel: "WHATSAPP",
      title: "Order Arrived",
      body: "Your monthly groceries have arrived at Clubhouse B1 drop point.",
    });

    expect(result.success).toBe(true);
    expect(result.notificationId).toBeDefined();

    const notif = await prisma.notification.findUnique({
      where: { id: result.notificationId },
    });
    expect(notif?.title).toBe("Order Arrived");
  });
});
