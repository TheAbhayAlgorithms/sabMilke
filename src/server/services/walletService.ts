import { prisma } from "@/server/db/client";
import { OrderStatus } from "@prisma/client";

export async function getWalletForUser(userId: string) {
  let wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId, balancePaise: 0 },
      include: {
        transactions: true,
      },
    });
  }

  return wallet;
}

export async function getUserSavings(userId: string) {
  const eligibleStatuses = [
    OrderStatus.CONFIRMED,
    OrderStatus.ALLOCATED,
    OrderStatus.RECEIVED_AT_DROP,
    OrderStatus.HANDED_OVER,
  ];

  const orders = await prisma.order.findMany({
    where: {
      userId,
      status: { in: eligibleStatuses },
    },
    include: {
      cycle: { select: { id: true, name: true, createdAt: true } },
      items: {
        include: {
          sku: {
            include: {
              product: true,
              benchmarkPrices: true,
            },
          },
        },
      },
      refunds: true,
    },
    orderBy: { createdAt: "desc" },
  });

  let totalSpentPaise = 0;
  let totalMrpPaise = 0;
  let totalBenchmarkRetailPaise = 0;
  let totalRefundsEarnedPaise = 0;

  const cycleBreakdownMap = new Map<string, {
    cycleId: string;
    cycleName: string;
    spentPaise: number;
    mrpPaise: number;
    savingsPaise: number;
    refundsPaise: number;
    itemsCount: number;
  }>();

  for (const order of orders) {
    const finalOrderCost = order.totalFinalPaise ?? order.totalGuaranteedPaise;
    totalSpentPaise += finalOrderCost;
    totalRefundsEarnedPaise += order.totalRefundPaise || 0;

    let orderMrp = 0;
    let orderBenchmark = 0;
    let orderUnits = 0;

    for (const item of order.items) {
      const itemMrp = item.sku.mrpPaise * item.quantity;
      orderMrp += itemMrp;
      orderUnits += item.quantity;

      // Calculate benchmark price (average across Zepto/Blinkit/Kirana, or 95% MRP fallback)
      const avgBenchmarkPaise =
        item.sku.benchmarkPrices.length > 0
          ? Math.round(
              item.sku.benchmarkPrices.reduce((s, b) => s + b.pricePaise, 0) /
                item.sku.benchmarkPrices.length
            )
          : Math.round(item.sku.mrpPaise * 0.95);

      orderBenchmark += avgBenchmarkPaise * item.quantity;
    }

    totalMrpPaise += orderMrp;
    totalBenchmarkRetailPaise += orderBenchmark;

    const cycleId = order.cycleId;
    const existing = cycleBreakdownMap.get(cycleId) || {
      cycleId,
      cycleName: order.cycle.name,
      spentPaise: 0,
      mrpPaise: 0,
      savingsPaise: 0,
      refundsPaise: 0,
      itemsCount: 0,
    };

    existing.spentPaise += finalOrderCost;
    existing.mrpPaise += orderMrp;
    existing.savingsPaise += Math.max(0, orderMrp - finalOrderCost);
    existing.refundsPaise += order.totalRefundPaise || 0;
    existing.itemsCount += orderUnits;

    cycleBreakdownMap.set(cycleId, existing);
  }

  const totalSavingsVsMrpPaise = Math.max(0, totalMrpPaise - totalSpentPaise);
  const totalSavingsVsQuickCommercePaise = Math.max(0, totalBenchmarkRetailPaise - totalSpentPaise);
  const savingsPercentVsMrp =
    totalMrpPaise > 0 ? Math.round((totalSavingsVsMrpPaise / totalMrpPaise) * 100) : 0;

  return {
    totalOrdersCount: orders.length,
    totalSpentPaise,
    totalMrpPaise,
    totalSavingsVsMrpPaise,
    totalSavingsVsQuickCommercePaise,
    savingsPercentVsMrp,
    totalRefundsEarnedPaise,
    cycleBreakdown: Array.from(cycleBreakdownMap.values()),
  };
}
