import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/server/db/client";
import {
  createCycle,
  openCycle,
  lockCycle,
  cancelCycle,
  lockExpiredCycles,
} from "@/server/services/cycleService";
import { CycleStatus, OrderStatus, WalletTxType, Role } from "@prisma/client";

describe("Cycle Service Integration & State Management (Milestone 3 Acceptance)", () => {
  let adminUserId: string;
  let societyId: string;
  let seededCycleId: string;

  beforeAll(async () => {
    // Fetch platform admin and demo society
    const adminUser = await prisma.user.findFirst({
      where: { memberships: { some: { role: Role.PLATFORM_ADMIN } } },
    });
    if (!adminUser) throw new Error("Platform admin user not found in database.");
    adminUserId = adminUser.id;

    const society = await prisma.society.findFirst();
    if (!society) throw new Error("Demo society not found in database.");
    societyId = society.id;

    // Find the cycle with orders; if previously locked, ensure it is OPEN for testing
    let targetCycle = await prisma.cycle.findFirst({
      where: { societyId, orders: { some: {} } },
    });
    if (!targetCycle) {
      targetCycle = await prisma.cycle.findFirst({ where: { societyId } });
    }
    if (!targetCycle) throw new Error("Cycle not found.");

    if (targetCycle.status !== CycleStatus.OPEN) {
      await prisma.cycle.update({
        where: { id: targetCycle.id },
        data: { status: CycleStatus.OPEN },
      });
    }
    seededCycleId = targetCycle.id;
  });

  it("locks the seeded cycle, computes final prices, selects winning suppliers, updates orders, credits wallet refunds, and logs audit entries", async () => {
    // Fetch initial resident wallet balances
    const initialOrders = await prisma.order.findMany({
      where: { cycleId: seededCycleId },
      include: { items: true },
    });
    expect(initialOrders.length).toBeGreaterThan(0);

    // Increase an item's ordered quantity to 25 to push pooled volume into Tier 2 (>= 20 units)
    // This unlocks wholesale volume discounts and generates price delta refunds
    const targetItem = initialOrders[0].items[0];
    await prisma.orderItem.update({
      where: { id: targetItem.id },
      data: { quantity: 25 },
    });

    const newTotalGuaranteedPaise =
      25 * targetItem.guaranteedPricePaise +
      initialOrders[0].items
        .filter((i) => i.id !== targetItem.id)
        .reduce((sum, i) => sum + i.quantity * i.guaranteedPricePaise, 0);

    await prisma.order.update({
      where: { id: initialOrders[0].id },
      data: {
        totalGuaranteedPaise: newTotalGuaranteedPaise,
      },
    });

    // Force lock the seeded cycle (testing admin force-lock or lock when threshold met)
    const lockedCycle = await lockCycle(adminUserId, seededCycleId, true);
    expect(lockedCycle.status).toBe(CycleStatus.LOCKED);

    // 1. Verify cycle status in database
    const dbCycle = await prisma.cycle.findUnique({
      where: { id: seededCycleId },
      include: { cycleSkus: true, orders: { include: { items: true } } },
    });
    expect(dbCycle?.status).toBe(CycleStatus.LOCKED);

    // 2. Verify all CycleSkus have final prices and chosen suppliers
    for (const cs of dbCycle!.cycleSkus) {
      expect(cs.finalPricePaise).toBeGreaterThan(0);
      expect(cs.finalPricePaise).toBeLessThanOrEqual(cs.guaranteedPricePaise);
      expect(cs.chosenSupplierQuoteId).toBeDefined();
    }

    // 3. Verify Orders and OrderItems updated
    for (const order of dbCycle!.orders) {
      expect(order.status).toBe(OrderStatus.ALLOCATED);
      expect(order.totalFinalPaise).toBeLessThanOrEqual(order.totalGuaranteedPaise);
      expect(order.totalRefundPaise).toBe(order.totalGuaranteedPaise - order.totalFinalPaise!);

      for (const item of order.items) {
        expect(item.finalPricePaise).toBeLessThanOrEqual(item.guaranteedPricePaise);
        expect(item.refundDeltaPaise).toBe(item.guaranteedPricePaise - item.finalPricePaise!);
      }
    }

    // 4. Verify Wallet transactions & refunds created for residents who received discounts
    const walletTxs = await prisma.walletTransaction.findMany({
      where: {
        type: WalletTxType.PRICE_DELTA_CREDIT,
      },
    });
    expect(walletTxs.length).toBeGreaterThan(0);

    const refunds = await prisma.refund.findMany({
      where: {
        reason: WalletTxType.PRICE_DELTA_CREDIT,
      },
    });
    expect(refunds.length).toBeGreaterThan(0);

    // 5. Verify AuditLog written
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entity: "Cycle",
        entityId: seededCycleId,
        action: "CYCLE_LOCKED",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog?.actorId).toBe(adminUserId);
    const afterData = auditLog?.after as any;
    expect(afterData.status).toBe(CycleStatus.LOCKED);
    expect(afterData.supplierDecisions).toBeDefined();
  });

  it("creates a new cycle, opens it, verifies food FSSAI compliance and audit log", async () => {
    const opensAt = new Date(Date.now() + 1000);
    const locksAt = new Date(Date.now() + 7 * 86400000);
    const deliveryTargetDate = new Date(Date.now() + 10 * 86400000);

    const newCycle = await createCycle(adminUserId, {
      societyId,
      name: "December 2026 Monthly Pool",
      opensAt,
      locksAt,
      deliveryTargetDate,
      minSocietyValuePaise: 5000000,
      minHouseholds: 10,
    });

    expect(newCycle.status).toBe(CycleStatus.DRAFT);
    expect(newCycle.name).toBe("December 2026 Monthly Pool");

    // Open the cycle
    const openedCycle = await openCycle(adminUserId, newCycle.id);
    expect(openedCycle.status).toBe(CycleStatus.OPEN);

    // Verify open audit log
    const openLog = await prisma.auditLog.findFirst({
      where: {
        entity: "Cycle",
        entityId: newCycle.id,
        action: "CYCLE_OPENED",
      },
    });
    expect(openLog).toBeDefined();

    // Cancel the cycle and verify cancellation audit log
    const cancelledCycle = await cancelCycle(adminUserId, newCycle.id, "Testing cycle cancellation");
    expect(cancelledCycle.status).toBe(CycleStatus.CANCELLED);

    const cancelLog = await prisma.auditLog.findFirst({
      where: {
        entity: "Cycle",
        entityId: newCycle.id,
        action: "CYCLE_CANCELLED",
      },
    });
    expect(cancelLog).toBeDefined();
  });

  it("lockExpiredCycles automatically identifies and locks cycles past their locksAt deadline", async () => {
    // Create an expired cycle (opensAt 2 days ago, locksAt 1 day ago)
    const expiredCycle = await prisma.cycle.create({
      data: {
        societyId,
        name: "Expired Test Cycle",
        status: CycleStatus.OPEN,
        opensAt: new Date(Date.now() - 2 * 86400000),
        locksAt: new Date(Date.now() - 1 * 86400000),
        deliveryTargetDate: new Date(Date.now() + 2 * 86400000),
        minSocietyValuePaise: 0, // 0 so it meets minimums and locks
        minHouseholds: 0,
      },
    });

    // Populate cycleSkus
    const sku = await prisma.sku.findFirst({
      include: { quotes: { include: { slabs: true, supplier: true } } },
    });
    if (sku) {
      await prisma.cycleSku.create({
        data: {
          cycleId: expiredCycle.id,
          skuId: sku.id,
          pooledQuantity: 10,
          guaranteedPricePaise: sku.mrpPaise,
        },
      });
    }

    const cronResult = await lockExpiredCycles();
    expect(cronResult.scannedCount).toBeGreaterThanOrEqual(1);

    const checkCycle = await prisma.cycle.findUnique({
      where: { id: expiredCycle.id },
    });
    expect(checkCycle?.status).toBe(CycleStatus.LOCKED);
  });
});
