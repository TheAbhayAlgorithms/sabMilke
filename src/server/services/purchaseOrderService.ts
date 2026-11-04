import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";
import {
  previewPurchaseOrders,
  ProposedPurchaseOrder,
  CycleSkuWithWinningQuote,
} from "@/server/domain/procurement";
import { PurchaseOrderStatus, CycleStatus, OrderStatus } from "@prisma/client";

export async function previewPurchaseOrdersForCycle(
  cycleId: string
): Promise<ProposedPurchaseOrder[]> {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: {
      society: true,
      cycleSkus: {
        include: {
          sku: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
        },
      },
    },
  });

  if (!cycle) {
    throw new Error("Cycle not found.");
  }

  const quoteIds = cycle.cycleSkus
    .map((cs) => cs.chosenSupplierQuoteId)
    .filter((id): id is string => Boolean(id));

  const quotes = await prisma.supplierQuote.findMany({
    where: { id: { in: quoteIds } },
    include: {
      supplier: true,
      slabs: { orderBy: { minQty: "asc" } },
    },
  });

  const quoteMap = new Map(quotes.map((q) => [q.id, q]));

  const cycleSkusInput: CycleSkuWithWinningQuote[] = cycle.cycleSkus.map((cs) => {
    const quote = cs.chosenSupplierQuoteId ? quoteMap.get(cs.chosenSupplierQuoteId) : null;
    let finalSupplierPricePaise = 0;
    if (quote && quote.slabs.length > 0) {
      const reachedSlab =
        quote.slabs
          .slice()
          .reverse()
          .find((s) => cs.pooledQuantity >= s.minQty) || quote.slabs[0];
      finalSupplierPricePaise = reachedSlab.supplierPricePaise;
    }

    return {
      skuId: cs.skuId,
      sku: {
        id: cs.sku.id,
        variantName: cs.sku.variantName,
        packSize: Number(cs.sku.packSize),
        unit: cs.sku.unit,
        mrpPaise: cs.sku.mrpPaise,
        product: {
          name: cs.sku.product.name,
          brand: cs.sku.product.brand,
          isFood: cs.sku.product.isFood,
          fssaiNumber: cs.sku.product.fssaiNumber,
          category: {
            name: cs.sku.product.category.name,
          },
        },
      },
      pooledQuantity: cs.pooledQuantity,
      finalPricePaise: cs.finalPricePaise,
      finalSupplierPricePaise,
      winningSupplierId: quote ? quote.supplierId : null,
      winningSupplierQuote: quote
        ? {
            id: quote.id,
            supplierId: quote.supplierId,
            supplier: {
              id: quote.supplier.id,
              name: quote.supplier.name,
              rating: Number(quote.supplier.rating),
            },
            leadTimeDays: quote.leadTimeDays,
            moq: quote.moq,
          }
        : null,
    };
  });

  return previewPurchaseOrders(cycleSkusInput);
}

export async function generateAndSendPurchaseOrders(
  actorId: string,
  cycleId: string
) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: {
      society: true,
      cycleSkus: true,
      orders: {
        where: { status: { in: [OrderStatus.PAID, OrderStatus.CONFIRMED] } },
      },
    },
  });

  if (!cycle) throw new Error("Cycle not found.");
  if (cycle.status !== CycleStatus.LOCKED) {
    throw new Error(`Cannot generate POs for cycle in ${cycle.status} status. Cycle must be LOCKED.`);
  }

  const proposedPos = await previewPurchaseOrdersForCycle(cycleId);
  if (proposedPos.length === 0) {
    throw new Error("No purchase orders to generate. Pooled quantities or winning quotes are missing.");
  }

  return prisma.$transaction(async (tx) => {
    const existingPoCount = await tx.purchaseOrder.count({
      where: { cycleId },
    });

    const createdPos = [];
    const lockTime = cycle.locksAt || new Date();

    for (let i = 0; i < proposedPos.length; i++) {
      const p = proposedPos[i];
      const poSeq = (existingPoCount + i + 1).toString().padStart(3, "0");
      const poNumber = `PO-${lockTime.getFullYear()}-${cycle.society.joinCode}-${cycle.id.slice(-4).toUpperCase()}-${poSeq}`;
      const expectedDelivery = new Date(
        lockTime.getTime() + p.leadTimeDays * 24 * 60 * 60 * 1000
      );

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          cycleId: cycle.id,
          supplierId: p.supplierId,
          status: PurchaseOrderStatus.ISSUED,
          totalAmountPaise: p.totalAmountPaise,
          expectedDelivery,
          items: {
            create: p.items.map((item) => ({
              skuId: item.skuId,
              orderedQuantity: item.orderedQuantity,
              unitPricePaise: item.unitPricePaise,
              totalPricePaise: item.totalPricePaise,
            })),
          },
        },
        include: {
          items: {
            include: { sku: true },
          },
          supplier: true,
        },
      });

      createdPos.push(po);

      // Audit log for each PO issued
      await recordAuditLog({
        actorId,
        action: "PO_ISSUED",
        entity: "PurchaseOrder",
        entityId: po.id,
        before: null,
        after: {
          poNumber: po.poNumber,
          supplierId: po.supplierId,
          totalAmountPaise: po.totalAmountPaise,
          status: po.status,
          itemsCount: po.items.length,
        },
      });
    }

    // Transition cycle to PO_SENT per state machine
    const updatedCycle = await tx.cycle.update({
      where: { id: cycleId },
      data: { status: CycleStatus.PO_SENT },
    });

    // Update orders to ALLOCATED
    await tx.order.updateMany({
      where: {
        cycleId,
        status: { in: [OrderStatus.PAID, OrderStatus.CONFIRMED] },
      },
      data: { status: OrderStatus.ALLOCATED },
    });

    // Record audit log for cycle state transition
    await recordAuditLog({
      actorId,
      action: "CYCLE_PO_SENT",
      entity: "Cycle",
      entityId: cycle.id,
      before: { status: cycle.status },
      after: {
        status: updatedCycle.status,
        purchaseOrdersCount: createdPos.length,
      },
    });

    return {
      success: true,
      cycle: updatedCycle,
      purchaseOrders: createdPos,
    };
  });
}

export async function getPurchaseOrdersForSupplier(supplierId: string) {
  return prisma.purchaseOrder.findMany({
    where: { supplierId },
    include: {
      cycle: {
        include: { society: true },
      },
      items: {
        include: { sku: { include: { product: true } } },
      },
      goodsReceipts: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPurchaseOrderDetail(poId: string, supplierId?: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      supplier: true,
      cycle: {
        include: {
          society: {
            include: { dropPoints: true },
          },
        },
      },
      items: {
        include: {
          sku: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
        },
      },
      goodsReceipts: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!po) throw new Error("Purchase order not found.");
  if (supplierId && po.supplierId !== supplierId) {
    throw new Error("Access denied. PO does not belong to this supplier.");
  }

  return po;
}

export async function confirmPurchaseOrder(actorId: string, poId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
  });
  if (!po) throw new Error("Purchase order not found.");
  if (po.status !== PurchaseOrderStatus.ISSUED) {
    throw new Error(`Cannot confirm PO in ${po.status} status. Must be ISSUED.`);
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { status: PurchaseOrderStatus.CONFIRMED },
  });

  await recordAuditLog({
    actorId,
    action: "PO_CONFIRMED",
    entity: "PurchaseOrder",
    entityId: po.id,
    before: { status: po.status },
    after: { status: updated.status },
  });

  return updated;
}

export async function uploadSupplierInvoice(
  actorId: string,
  poId: string,
  invoiceUrl: string
) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
  });
  if (!po) throw new Error("Purchase order not found.");

  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { invoiceUrl },
  });

  await recordAuditLog({
    actorId,
    action: "PO_INVOICE_UPLOADED",
    entity: "PurchaseOrder",
    entityId: po.id,
    before: { invoiceUrl: po.invoiceUrl },
    after: { invoiceUrl: updated.invoiceUrl },
  });

  return updated;
}

export async function dispatchPurchaseOrder(actorId: string, poId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
  });
  if (!po) throw new Error("Purchase order not found.");
  if (
    po.status !== PurchaseOrderStatus.CONFIRMED &&
    po.status !== PurchaseOrderStatus.ISSUED
  ) {
    throw new Error(`Cannot dispatch PO in ${po.status} status.`);
  }

  const dispatchedAt = new Date();
  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: PurchaseOrderStatus.DISPATCHED,
      dispatchedAt,
    },
  });

  await recordAuditLog({
    actorId,
    action: "PO_DISPATCHED",
    entity: "PurchaseOrder",
    entityId: po.id,
    before: { status: po.status, dispatchedAt: po.dispatchedAt },
    after: { status: updated.status, dispatchedAt: updated.dispatchedAt },
  });

  return updated;
}
