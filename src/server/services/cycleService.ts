import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";
import {
  validateCycleTransition,
  validateFoodSkusForCycleOpen,
  evaluateSocietyMinimums,
} from "@/server/domain/cycleStateMachine";
import {
  computeGuaranteedPrice,
  computeFinalPrice,
  computeRefundDelta,
} from "@/server/domain/pricing";
import {
  selectCheapestSupplierQuote,
  SupplierCandidateQuote,
} from "@/server/domain/supplierSelection";
import { CycleStatus, OrderStatus, WalletTxType, Role } from "@prisma/client";

export interface CreateCycleInput {
  societyId: string;
  name: string;
  opensAt: Date;
  locksAt: Date;
  deliveryTargetDate: Date;
  minSocietyValuePaise?: number;
  minHouseholds?: number;
}

export async function createCycle(actorId: string | null | undefined, input: CreateCycleInput) {
  if (input.locksAt <= input.opensAt) {
    throw new Error("Lock date must be after cycle open date.");
  }
  if (input.deliveryTargetDate <= input.locksAt) {
    throw new Error("Delivery target date must be after lock date.");
  }

  const society = await prisma.society.findUnique({
    where: { id: input.societyId },
  });
  if (!society) {
    throw new Error(`Society '${input.societyId}' not found.`);
  }

  // Fetch all active catalogue SKUs and quotes
  const skus = await prisma.sku.findMany({
    where: { isActive: true },
    include: {
      quotes: {
        where: { isActive: true },
        include: {
          slabs: { orderBy: { minQty: "asc" } },
        },
      },
    },
  });

  return prisma.$transaction(async (tx) => {
    const cycle = await tx.cycle.create({
      data: {
        societyId: input.societyId,
        name: input.name,
        status: CycleStatus.DRAFT,
        opensAt: input.opensAt,
        locksAt: input.locksAt,
        deliveryTargetDate: input.deliveryTargetDate,
        minSocietyValuePaise: input.minSocietyValuePaise ?? society.minSocietyValuePaise,
        minHouseholds: input.minHouseholds ?? society.minHouseholds,
      },
    });

    // Populate CycleSku for each catalogue SKU with guaranteed price
    for (const sku of skus) {
      // Find lowest slab supplier price across active quotes (Tier 1)
      let lowestSupplierPrice = sku.mrpPaise;
      for (const q of sku.quotes) {
        if (q.slabs.length > 0 && q.slabs[0].supplierPricePaise < lowestSupplierPrice) {
          lowestSupplierPrice = q.slabs[0].supplierPricePaise;
        }
      }

      const guaranteedPrice = computeGuaranteedPrice(lowestSupplierPrice, {
        marginPercent: Number(sku.marginPercent),
        marginMinPaise: sku.marginMinPaise,
        mrpPaise: sku.mrpPaise,
      });

      await tx.cycleSku.create({
        data: {
          cycleId: cycle.id,
          skuId: sku.id,
          pooledQuantity: 0,
          guaranteedPricePaise: guaranteedPrice,
        },
      });
    }

    await recordAuditLog(
      {
        societyId: input.societyId,
        actorId,
        action: "CYCLE_CREATED",
        entity: "Cycle",
        entityId: cycle.id,
        after: { name: cycle.name, status: cycle.status },
      },
      tx
    );

    return cycle;
  });
}

export async function openCycle(actorId: string | null | undefined, cycleId: string) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: {
      society: true,
      cycleSkus: {
        include: {
          sku: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!cycle) {
    throw new Error(`Cycle '${cycleId}' not found.`);
  }

  // 1. State machine validation
  validateCycleTransition(cycle.status, CycleStatus.OPEN);

  // 2. Compliance pre-condition check: All food SKUs must have FSSAI
  const foodChecks = cycle.cycleSkus.map((cs) => ({
    isFood: cs.sku.product.isFood,
    fssaiNumber: cs.sku.product.fssaiNumber,
    skuName: `${cs.sku.product.brand} ${cs.sku.product.name}`,
  }));
  validateFoodSkusForCycleOpen(foodChecks);

  const updated = await prisma.cycle.update({
    where: { id: cycleId },
    data: { status: CycleStatus.OPEN },
  });

  await recordAuditLog({
    societyId: cycle.societyId,
    actorId,
    action: "CYCLE_OPENED",
    entity: "Cycle",
    entityId: cycle.id,
    before: { status: cycle.status },
    after: { status: CycleStatus.OPEN },
  });

  return updated;
}

export async function cancelCycle(actorId: string | null | undefined, cycleId: string, reason: string) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: {
      orders: {
        where: { status: { in: [OrderStatus.PAID, OrderStatus.CONFIRMED] } },
        include: { payments: true },
      },
    },
  });

  if (!cycle) {
    throw new Error(`Cycle '${cycleId}' not found.`);
  }

  validateCycleTransition(cycle.status, CycleStatus.CANCELLED);

  return prisma.$transaction(async (tx) => {
    // Auto-refund all orders to resident wallets
    for (const order of cycle.orders) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          totalRefundPaise: order.totalGuaranteedPaise,
        },
      });

      // Credit wallet
      let wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId: order.userId, balancePaise: 0 },
        });
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balancePaise: { increment: order.totalGuaranteedPaise } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amountPaise: order.totalGuaranteedPaise,
          type: WalletTxType.CANCELLATION_REFUND,
          referenceId: order.id,
          description: `Full refund for cycle cancellation (${reason})`,
        },
      });

      await tx.refund.create({
        data: {
          orderId: order.id,
          amountPaise: order.totalGuaranteedPaise,
          reason: WalletTxType.CANCELLATION_REFUND,
          status: "SUCCESS",
        },
      });
    }

    const updated = await tx.cycle.update({
      where: { id: cycleId },
      data: { status: CycleStatus.CANCELLED },
    });

    await recordAuditLog(
      {
        societyId: cycle.societyId,
        actorId,
        action: "CYCLE_CANCELLED",
        entity: "Cycle",
        entityId: cycle.id,
        before: { status: cycle.status },
        after: { status: CycleStatus.CANCELLED, reason, ordersRefunded: cycle.orders.length },
      },
      tx
    );

    return updated;
  });
}

export async function lockCycle(
  actorId: string | null | undefined,
  cycleId: string,
  isForceLock = false
) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: {
      society: true,
      cycleSkus: {
        include: {
          sku: {
            include: {
              quotes: {
                where: { isActive: true },
                include: {
                  supplier: true,
                  slabs: { orderBy: { minQty: "asc" } },
                },
              },
            },
          },
        },
      },
      orders: {
        where: { status: { in: [OrderStatus.PAID, OrderStatus.CONFIRMED] } },
        include: {
          items: true,
        },
      },
    },
  });

  if (!cycle) {
    throw new Error(`Cycle '${cycleId}' not found.`);
  }

  // 1. Check state transition
  validateCycleTransition(cycle.status, CycleStatus.LOCKED);

  // 2. Evaluate society minimums (unless forced by admin)
  const totalValuePaise = cycle.orders.reduce((sum, o) => sum + o.totalGuaranteedPaise, 0);
  const uniqueHouseholds = new Set(cycle.orders.map((o) => o.flatId)).size;

  if (!isForceLock) {
    const minimumCheck = evaluateSocietyMinimums({
      totalValuePaise,
      uniqueHouseholds,
      minSocietyValuePaise: cycle.minSocietyValuePaise,
      minHouseholds: cycle.minHouseholds,
    });

    if (!minimumCheck.meetsMinimum) {
      console.log(`[CYCLE AUTO-CANCEL] Minimums not met: ${minimumCheck.reason}`);
      return cancelCycle(actorId, cycleId, minimumCheck.reason!);
    }
  }

  return prisma.$transaction(async (tx) => {
    const auditDecisions: Record<string, string> = {};
    const finalPricesBySkuId = new Map<string, number>();
    let totalSocietyRefundsPaise = 0;

    // 3. For each SKU, aggregate pooled quantity, select winning supplier, and calculate final price
    for (const cs of cycle.cycleSkus) {
      // Sum pooled quantity from all confirmed orders for this SKU
      const pooledQty = cycle.orders.reduce((sum, order) => {
        const item = order.items.find((i) => i.skuId === cs.skuId);
        return sum + (item ? item.quantity : 0);
      }, 0);

      const candidateQuotes: SupplierCandidateQuote[] = cs.sku.quotes.map((q) => ({
        quoteId: q.id,
        supplierId: q.supplierId,
        supplierName: q.supplier.name,
        supplierRating: Number(q.supplier.rating),
        moq: q.moq,
        leadTimeDays: q.leadTimeDays,
        validFrom: q.validFrom,
        validTo: q.validTo,
        createdAt: q.createdAt,
        slabs: q.slabs.map((sl) => ({
          minQty: sl.minQty,
          maxQty: sl.maxQty,
          supplierPricePaise: sl.supplierPricePaise,
        })),
      }));

      let finalPricePaise = cs.guaranteedPricePaise;
      let chosenQuoteId: string | null = null;

      if (candidateQuotes.length > 0) {
        try {
          const selection = selectCheapestSupplierQuote(
            candidateQuotes,
            Math.max(1, pooledQty), // if 0 pooled, evaluate at minimum
            cycle.deliveryTargetDate,
            new Date()
          );

          chosenQuoteId = selection.winningQuoteId;

          finalPricePaise = computeFinalPrice(
            selection.supplierPricePaise,
            {
              marginPercent: Number(cs.sku.marginPercent),
              marginMinPaise: cs.sku.marginMinPaise,
              mrpPaise: cs.sku.mrpPaise,
            },
            cs.guaranteedPricePaise
          );

          auditDecisions[cs.skuId] = selection.decisionReason;
        } catch (err: unknown) {
          // If no quote satisfies MOQ, fall back to guaranteed price
          auditDecisions[cs.skuId] = `No eligible quote satisfied MOQ; retained guaranteed price: ${
            err instanceof Error ? err.message : ""
          }`;
        }
      }

      finalPricesBySkuId.set(cs.skuId, finalPricePaise);

      await tx.cycleSku.update({
        where: { id: cs.id },
        data: {
          pooledQuantity: pooledQty,
          finalPricePaise,
          chosenSupplierQuoteId: chosenQuoteId,
        },
      });
    }

    // 4. Update order items and calculate refund deltas for each resident order
    for (const order of cycle.orders) {
      let orderTotalFinalPaise = 0;
      let orderTotalRefundPaise = 0;

      for (const item of order.items) {
        const itemFinalPrice = finalPricesBySkuId.get(item.skuId) ?? item.guaranteedPricePaise;
        const refundDelta = computeRefundDelta(item.guaranteedPricePaise, itemFinalPrice);
        const itemTotalRefund = refundDelta * item.quantity;

        orderTotalFinalPaise += itemFinalPrice * item.quantity;
        orderTotalRefundPaise += itemTotalRefund;

        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            finalPricePaise: itemFinalPrice,
            refundDeltaPaise: refundDelta,
          },
        });
      }

      // Update Order totals
      await tx.order.update({
        where: { id: order.id },
        data: {
          totalFinalPaise: orderTotalFinalPaise,
          totalRefundPaise: orderTotalRefundPaise,
          status: OrderStatus.ALLOCATED,
        },
      });

      // 5. Credit price delta refund to resident wallet (Rule 1 & Rule 3)
      if (orderTotalRefundPaise > 0) {
        totalSocietyRefundsPaise += orderTotalRefundPaise;

        let wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId: order.userId, balancePaise: 0 },
          });
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balancePaise: { increment: orderTotalRefundPaise } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amountPaise: orderTotalRefundPaise,
            type: WalletTxType.PRICE_DELTA_CREDIT,
            referenceId: order.id,
            description: `Volume discount price drop savings for Order ${order.pickupCode}`,
          },
        });

        await tx.refund.create({
          data: {
            orderId: order.id,
            amountPaise: orderTotalRefundPaise,
            reason: WalletTxType.PRICE_DELTA_CREDIT,
            status: "SUCCESS",
          },
        });
      }
    }

    // 6. Transition cycle to LOCKED
    const lockedCycle = await tx.cycle.update({
      where: { id: cycleId },
      data: { status: CycleStatus.LOCKED },
    });

    // 7. Record comprehensive state transition in AuditLog (Rule 2)
    await recordAuditLog(
      {
        societyId: cycle.societyId,
        actorId,
        action: "CYCLE_LOCKED",
        entity: "Cycle",
        entityId: cycle.id,
        before: { status: cycle.status },
        after: {
          status: CycleStatus.LOCKED,
          isForceLock,
          totalSocietyValuePaise: totalValuePaise,
          uniqueHouseholds,
          totalRefundsDistributedPaise: totalSocietyRefundsPaise,
          supplierDecisions: auditDecisions,
        },
      },
      tx
    );

    return lockedCycle;
  });
}

/**
 * Scheduled job: Locks all cycles whose locksAt <= now() and status === OPEN.
 */
export async function lockExpiredCycles() {
  const now = new Date();
  const expired = await prisma.cycle.findMany({
    where: {
      status: CycleStatus.OPEN,
      locksAt: { lte: now },
    },
  });

  const results = [];
  for (const c of expired) {
    try {
      const locked = await lockCycle(null, c.id, false);
      results.push({ cycleId: c.id, status: locked.status });
    } catch (err: unknown) {
      console.error(`Failed to lock cycle ${c.id}:`, err);
      results.push({ cycleId: c.id, error: err instanceof Error ? err.message : "Error" });
    }
  }

  return {
    scannedCount: expired.length,
    lockedCount: results.filter((r) => r.status === CycleStatus.LOCKED).length,
    results,
  };
}
