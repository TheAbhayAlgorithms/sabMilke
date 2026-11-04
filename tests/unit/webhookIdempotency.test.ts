import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/server/db/client";
import { processRazorpayWebhook } from "@/server/services/webhookService";
import { createOrder } from "@/server/services/orderService";
import { OrderStatus, PaymentStatus, CycleStatus } from "@prisma/client";

describe("Payment Webhook Idempotency & Signature Verification (Rule 4 Acceptance)", () => {
  let orderId: string;
  let cycleId: string;
  let skuId: string;
  let providerOrderId: string;
  const testEventId = `evt_test_${Date.now()}`;

  beforeAll(async () => {
    // 1. Fetch demo society and flat B-509
    const society = await prisma.society.findFirst({
      include: { flats: true },
    });
    if (!society) throw new Error("Demo society missing.");

    const vacantFlat = society.flats.find((f) => f.flatNumber === "B-509") || society.flats[society.flats.length - 2];

    const resident = await prisma.user.findFirst({
      where: { phone: "9876543226" },
    });
    if (!resident) throw new Error("Resident user not found.");

    // Create a dedicated OPEN cycle for webhook idempotency tests
    const dedicatedCycle = await prisma.cycle.create({
      data: {
        societyId: society.id,
        name: "Webhook Dedicated Cycle",
        status: CycleStatus.OPEN,
        opensAt: new Date(Date.now() - 86400000),
        locksAt: new Date(Date.now() + 7 * 86400000),
        deliveryTargetDate: new Date(Date.now() + 10 * 86400000),
        minSocietyValuePaise: 100000,
        minHouseholds: 1,
      },
    });
    cycleId = dedicatedCycle.id;

    const sku = await prisma.sku.findFirst({ where: { isActive: true } });
    if (!sku) throw new Error("SKU not found.");
    skuId = sku.id;

    await prisma.cycleSku.create({
      data: {
        cycleId,
        skuId,
        pooledQuantity: 0,
        guaranteedPricePaise: sku.mrpPaise,
      },
    });

    // Create a pending order
    const orderResult = await createOrder(resident.id, {
      societyId: society.id,
      cycleId,
      flatId: vacantFlat.id,
      items: [{ skuId, quantity: 3 }],
      useWalletPaise: 0,
    });

    orderId = orderResult.order.id;
    providerOrderId = orderResult.paymentOrder?.providerOrderId || `mock_order_${Date.now()}`;
  });

  it("rejects webhook if signature is invalid", async () => {
    const rawBody = JSON.stringify({
      event: "payment.captured",
      id: "fake_evt",
      notes: { orderId },
    });

    await expect(
      processRazorpayWebhook(rawBody, "invalid_signature", "fake_evt")
    ).rejects.toThrow(/invalid razorpay webhook signature/i);
  });

  it("processes a valid webhook, records ProviderEvent, confirms payment and increments pool", async () => {
    const initialCycleSku = await prisma.cycleSku.findUnique({
      where: { cycleId_skuId: { cycleId, skuId } },
    });

    const payloadObj = {
      event: "payment.captured",
      id: testEventId,
      payload: {
        payment: {
          entity: {
            id: `pay_test_${Date.now()}`,
            order_id: providerOrderId,
            method: "UPI",
            vpa: "resident@okhdfcbank",
            notes: { orderId },
          },
        },
      },
    };
    const rawBody = JSON.stringify(payloadObj);

    // MockPaymentAdapter accepts "mock_valid_signature" as valid
    const result = await processRazorpayWebhook(rawBody, "mock_valid_signature", testEventId);

    expect(result.received).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.orderId).toBe(orderId);
    expect(result.actionTaken).toBe("PAYMENT_CONFIRMED");

    // 1. Verify ProviderEvent stored
    const providerEvent = await prisma.providerEvent.findUnique({
      where: { eventId: testEventId },
    });
    expect(providerEvent).toBeDefined();
    expect(providerEvent?.provider).toBe("RAZORPAY");

    // 2. Verify Order updated to CONFIRMED
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    expect(updatedOrder?.status).toBe(OrderStatus.CONFIRMED);
    expect(updatedOrder?.payments[0].status).toBe(PaymentStatus.SUCCESS);

    // 3. Verify CycleSku pooledQuantity incremented by 3
    const updatedCycleSku = await prisma.cycleSku.findUnique({
      where: { cycleId_skuId: { cycleId, skuId } },
    });
    expect(updatedCycleSku?.pooledQuantity).toBe((initialCycleSku?.pooledQuantity ?? 0) + 3);

    // 4. Verify AuditLog written
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entity: "Order",
        entityId: orderId,
        action: "ORDER_PAID",
      },
    });
    expect(auditLog).toBeDefined();

    // -------------------------------------------------------------
    // WEBHOOK REPLAY TEST (Rule 4 Acceptance Criteria):
    // Replaying the exact same webhook must NOT double-credit or double-increment!
    // -------------------------------------------------------------
    const replayResult = await processRazorpayWebhook(rawBody, "mock_valid_signature", testEventId);

    expect(replayResult.received).toBe(true);
    expect(replayResult.duplicate).toBe(true);
    expect(replayResult.actionTaken).toBe("IGNORED_DUPLICATE");

    // Verify pooled quantity has NOT changed after replay
    const afterReplayCycleSku = await prisma.cycleSku.findUnique({
      where: { cycleId_skuId: { cycleId, skuId } },
    });
    expect(afterReplayCycleSku?.pooledQuantity).toBe(updatedCycleSku?.pooledQuantity);
  });
});
