import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/server/db/client";
import {
  createOrder,
  confirmOrderPayment,
  reorderLastMonth,
  getOrdersForUser,
} from "@/server/services/orderService";
import { OrderStatus, PaymentStatus, WalletTxType, Role, CycleStatus } from "@prisma/client";

describe("Order Service & Payment Lifecycle (Milestone 4)", () => {
  let residentUserId: string;
  let societyId: string;
  let openCycleId: string;
  let flatId: string;
  let testSkuId: string;
  let testSkuPricePaise: number;

  beforeAll(async () => {
    // 1. Fetch demo society
    const society = await prisma.society.findFirst({
      include: { flats: true },
    });
    if (!society) throw new Error("Demo society missing.");
    societyId = society.id;

    // Use Flat B-510
    const vacantFlat = society.flats.find((f) => f.flatNumber === "B-510") || society.flats[society.flats.length - 1];
    flatId = vacantFlat.id;

    // 2. Fetch a resident user
    const resident = await prisma.user.findFirst({
      where: { phone: "9876543225" },
      include: { wallet: true },
    });
    if (!resident) throw new Error("Resident user not found.");
    residentUserId = resident.id;

    // 3. Create a dedicated OPEN cycle for order service tests to avoid parallel test collisions
    const dedicatedCycle = await prisma.cycle.create({
      data: {
        societyId,
        name: "Order Service Dedicated Cycle",
        status: CycleStatus.OPEN,
        opensAt: new Date(Date.now() - 86400000),
        locksAt: new Date(Date.now() + 7 * 86400000),
        deliveryTargetDate: new Date(Date.now() + 10 * 86400000),
        minSocietyValuePaise: 100000,
        minHouseholds: 1,
      },
    });
    openCycleId = dedicatedCycle.id;

    const sku = await prisma.sku.findFirst({ where: { isActive: true } });
    if (!sku) throw new Error("SKU not found.");
    testSkuId = sku.id;
    testSkuPricePaise = sku.mrpPaise;

    await prisma.cycleSku.create({
      data: {
        cycleId: openCycleId,
        skuId: testSkuId,
        pooledQuantity: 0,
        guaranteedPricePaise: testSkuPricePaise,
      },
    });
  });

  it("creates an order with guaranteed prices, enforces integer paise and writes audit log", async () => {
    const initialPooled = await prisma.cycleSku.findUnique({
      where: { cycleId_skuId: { cycleId: openCycleId, skuId: testSkuId } },
    });

    const result = await createOrder(residentUserId, {
      societyId,
      cycleId: openCycleId,
      flatId,
      items: [{ skuId: testSkuId, quantity: 2 }],
      useWalletPaise: 0,
    });

    expect(result.order).toBeDefined();
    expect(result.order.status).toBe(OrderStatus.PENDING_PAYMENT);
    expect(result.order.totalGuaranteedPaise).toBe(testSkuPricePaise * 2);
    expect(result.netPayablePaise).toBe(testSkuPricePaise * 2);
    expect(result.walletDeductionPaise).toBe(0);

    // Verify AuditLog written
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entity: "Order",
        entityId: result.order.id,
        action: "ORDER_CREATED",
      },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog?.actorId).toBe(residentUserId);

    // Confirm Payment
    const confirmResult = await confirmOrderPayment(residentUserId, {
      orderId: result.order.id,
      providerPaymentId: `test_pay_${Date.now()}`,
      paymentMethod: "UPI_INTENT",
    });

    expect(confirmResult.order.status).toBe(OrderStatus.CONFIRMED);
    expect(confirmResult.alreadyConfirmed).toBe(false);

    // Verify pooled quantity incremented by 2
    const updatedCycleSku = await prisma.cycleSku.findUnique({
      where: { cycleId_skuId: { cycleId: openCycleId, skuId: testSkuId } },
    });
    expect(updatedCycleSku?.pooledQuantity).toBe((initialPooled?.pooledQuantity ?? 0) + 2);

    // IDEMPOTENCY CHECK: Confirming the exact same order a second time must NOT double-increment pooledQuantity!
    const repeatResult = await confirmOrderPayment(residentUserId, {
      orderId: result.order.id,
      providerPaymentId: "repeat_payment_call",
    });
    expect(repeatResult.alreadyConfirmed).toBe(true);

    const checkCycleSku = await prisma.cycleSku.findUnique({
      where: { cycleId_skuId: { cycleId: openCycleId, skuId: testSkuId } },
    });
    expect(checkCycleSku?.pooledQuantity).toBe(updatedCycleSku?.pooledQuantity);
  });

  it("enforces 'One active order per flat per cycle' constraint", async () => {
    // Attempting to place a second active order for the same flat in the same cycle must fail
    await expect(
      createOrder(residentUserId, {
        societyId,
        cycleId: openCycleId,
        flatId, // Same flat B-510 already has an order from previous test
        items: [{ skuId: testSkuId, quantity: 1 }],
      })
    ).rejects.toThrow(/already exists for flat/i);
  });

  it("reorderLastMonth returns items from past order with current cycle guaranteed prices", async () => {
    const reorderData = await reorderLastMonth(residentUserId, openCycleId);
    expect(reorderData.items.length).toBeGreaterThan(0);
    expect(reorderData.items[0].skuId).toBe(testSkuId);
    expect(reorderData.items[0].guaranteedPricePaise).toBe(testSkuPricePaise);
    expect(reorderData.items[0].quantity).toBe(2);
  });
});
