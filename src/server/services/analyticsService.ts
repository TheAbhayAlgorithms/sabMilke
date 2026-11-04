import { prisma } from "@/server/db/client";
import {
  computePlatformAnalytics,
  computeSocietyAdminAnalytics,
  PlatformAnalyticsResult,
  SocietyAdminAnalyticsResult,
} from "@/server/domain/analytics";
import { OrderStatus } from "@prisma/client";

export async function getPlatformAnalytics(): Promise<PlatformAnalyticsResult> {
  const [orders, societies, purchaseOrders, refunds] = await Promise.all([
    // All paid/confirmed/handed over orders
    prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.PAID,
            OrderStatus.CONFIRMED,
            OrderStatus.ALLOCATED,
            OrderStatus.RECEIVED_AT_DROP,
            OrderStatus.SHORT_SUPPLIED,
            OrderStatus.HANDED_OVER,
          ],
        },
      },
      include: {
        items: {
          include: {
            sku: {
              include: {
                benchmarkPrices: true,
              },
            },
          },
        },
      },
    }),

    // Societies with flat counts
    prisma.society.findMany({
      include: {
        _count: {
          select: { flats: true },
        },
      },
    }),

    // Purchase orders with goods receipts
    prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: true,
        goodsReceipts: {
          include: { items: true },
        },
      },
    }),

    // All refunds
    prisma.refund.findMany(),
  ]);

  const mappedOrders = orders.map((o) => ({
    id: o.id,
    societyId: o.societyId,
    flatId: o.flatId,
    totalGuaranteedPaise: o.totalGuaranteedPaise,
    totalFinalPaise: o.totalFinalPaise,
    totalRefundPaise: o.totalRefundPaise,
    items: o.items.map((it) => {
      // Find lowest or average benchmark price
      const benchmarkPricePaise =
        it.sku.benchmarkPrices.length > 0
          ? Math.round(
              it.sku.benchmarkPrices.reduce((s, b) => s + b.pricePaise, 0) /
                it.sku.benchmarkPrices.length
            )
          : null;
      return {
        quantity: it.quantity,
        guaranteedPricePaise: it.guaranteedPricePaise,
        finalPricePaise: it.finalPricePaise,
        benchmarkPricePaise,
      };
    }),
  }));

  const mappedSocieties = societies.map((s) => ({
    id: s.id,
    name: s.name,
    joinCode: s.joinCode,
    flatsCount: s._count.flats,
  }));

  const mappedPos = purchaseOrders.map((po) => ({
    id: po.id,
    supplierId: po.supplierId,
    supplierName: po.supplier.name,
    supplierRating: Number(po.supplier.rating),
    totalAmountPaise: po.totalAmountPaise,
    items: po.items.map((it) => ({
      orderedQuantity: it.orderedQuantity,
    })),
    goodsReceipts: po.goodsReceipts.map((gr) => ({
      items: gr.items.map((gri) => ({
        receivedQty: gri.receivedQty,
        shortQty: gri.shortQty,
      })),
    })),
  }));

  return computePlatformAnalytics({
    orders: mappedOrders,
    societies: mappedSocieties,
    purchaseOrders: mappedPos,
    refunds: refunds.map((r) => ({ amountPaise: r.amountPaise })),
  });
}

export async function getSocietyAdminAnalytics(
  societyId: string
): Promise<SocietyAdminAnalyticsResult> {
  const society = await prisma.society.findUnique({
    where: { id: societyId },
    include: {
      _count: { select: { flats: true } },
      cycles: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!society) {
    throw new Error("Society not found.");
  }

  const orders = await prisma.order.findMany({
    where: {
      societyId,
      status: {
        in: [
          OrderStatus.PAID,
          OrderStatus.CONFIRMED,
          OrderStatus.ALLOCATED,
          OrderStatus.RECEIVED_AT_DROP,
          OrderStatus.SHORT_SUPPLIED,
          OrderStatus.HANDED_OVER,
        ],
      },
    },
    include: {
      items: {
        include: {
          sku: {
            include: { benchmarkPrices: true },
          },
        },
      },
    },
  });

  const mappedOrders = orders.map((o) => ({
    id: o.id,
    cycleId: o.cycleId,
    flatId: o.flatId,
    totalGuaranteedPaise: o.totalGuaranteedPaise,
    totalFinalPaise: o.totalFinalPaise,
    totalRefundPaise: o.totalRefundPaise,
    items: o.items.map((it) => {
      const benchmarkPricePaise =
        it.sku.benchmarkPrices.length > 0
          ? Math.round(
              it.sku.benchmarkPrices.reduce((s, b) => s + b.pricePaise, 0) /
                it.sku.benchmarkPrices.length
            )
          : null;
      return {
        quantity: it.quantity,
        guaranteedPricePaise: it.guaranteedPricePaise,
        finalPricePaise: it.finalPricePaise,
        benchmarkPricePaise,
      };
    }),
  }));

  return computeSocietyAdminAnalytics({
    society: {
      id: society.id,
      name: society.name,
      joinCode: society.joinCode,
      totalFlats: society._count.flats,
    },
    orders: mappedOrders,
    cycles: society.cycles.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
    })),
    rebatePercent: 2.0, // 2% RWA community rebate
  });
}

