import { formatINR } from "@/lib/money";

export interface SocietyContribution {
  societyId: string;
  societyName: string;
  joinCode: string;
  totalFlats: number;
  participatingFlats: number;
  participationPercent: number;
  orderCount: number;
  gmvPaise: number;
  residentSavingsPaise: number;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  rating: number;
  poCount: number;
  orderedUnits: number;
  deliveredUnits: number;
  fillRatePercent: number;
  totalWholesalePaise: number;
}

export interface PlatformAnalyticsResult {
  gmvPaise: number;
  totalOrders: number;
  totalParticipatingHouseholds: number;
  totalFlatsAcrossSocieties: number;
  overallParticipationPercent: number;
  totalResidentSavingsPaise: number;
  effectiveSavingPercent: number;
  supplierFillRatePercent: number;
  totalRefundsPaise: number;
  refundRatePercent: number;
  societies: SocietyContribution[];
  suppliers: SupplierPerformance[];
}

export interface SocietyAdminAnalyticsResult {
  societyId: string;
  societyName: string;
  joinCode: string;
  totalFlats: number;
  participatingFlats: number;
  participationPercent: number;
  gmvPaise: number;
  totalOrders: number;
  totalUnitsDistributed: number;
  priceDropSavingsPaise: number;
  retailBenchmarkSavingsPaise: number;
  totalResidentSavingsPaise: number;
  societyRebatePaise: number; // e.g. 2% community development rebate
  cycles: {
    id: string;
    name: string;
    status: string;
    gmvPaise: number;
    ordersCount: number;
    participatingFlats: number;
    savingsPaise: number;
  }[];
}

/**
 * Pure function: calculates overall platform analytics
 */
export function computePlatformAnalytics(input: {
  orders: {
    id: string;
    societyId: string;
    flatId: string;
    totalGuaranteedPaise: number;
    totalFinalPaise: number | null;
    totalRefundPaise: number;
    items: {
      quantity: number;
      guaranteedPricePaise: number;
      finalPricePaise: number | null;
      benchmarkPricePaise?: number | null;
    }[];
  }[];
  societies: {
    id: string;
    name: string;
    joinCode: string;
    flatsCount: number;
  }[];
  purchaseOrders: {
    id: string;
    supplierId: string;
    supplierName: string;
    supplierRating: number;
    totalAmountPaise: number;
    items: {
      orderedQuantity: number;
    }[];
    goodsReceipts: {
      items: {
        receivedQty: number;
        shortQty: number;
      }[];
    }[];
  }[];
  refunds: {
    amountPaise: number;
  }[];
}): PlatformAnalyticsResult {
  let gmvPaise = 0;
  let totalTierSavingsPaise = 0;
  let totalBenchmarkSavingsPaise = 0;
  const uniqueFlats = new Set<string>();

  const societyOrderMap = new Map<
    string,
    { gmv: number; orders: number; flats: Set<string>; savings: number }
  >();

  for (const s of input.societies) {
    societyOrderMap.set(s.id, {
      gmv: 0,
      orders: 0,
      flats: new Set<string>(),
      savings: 0,
    });
  }

  for (const order of input.orders) {
    const orderGmv = order.totalFinalPaise ?? order.totalGuaranteedPaise;
    gmvPaise += orderGmv;
    uniqueFlats.add(order.flatId);

    const sStats = societyOrderMap.get(order.societyId);
    if (sStats) {
      sStats.gmv += orderGmv;
      sStats.orders += 1;
      sStats.flats.add(order.flatId);
    }

    // Savings calculation
    const tierSavings = Math.max(
      0,
      order.totalGuaranteedPaise - (order.totalFinalPaise ?? order.totalGuaranteedPaise)
    );
    totalTierSavingsPaise += tierSavings;
    if (sStats) sStats.savings += tierSavings;

    for (const item of order.items) {
      if (item.benchmarkPricePaise && item.benchmarkPricePaise > 0) {
        const itemPrice = item.finalPricePaise ?? item.guaranteedPricePaise;
        const diff = Math.max(0, item.benchmarkPricePaise - itemPrice);
        const benchmarkSavings = diff * item.quantity;
        totalBenchmarkSavingsPaise += benchmarkSavings;
        if (sStats) sStats.savings += benchmarkSavings;
      }
    }
  }

  const totalResidentSavingsPaise = totalTierSavingsPaise + totalBenchmarkSavingsPaise;

  const totalFlatsAcrossSocieties = input.societies.reduce(
    (sum, s) => sum + s.flatsCount,
    0
  );

  const overallParticipationPercent =
    totalFlatsAcrossSocieties > 0
      ? Number(
          ((uniqueFlats.size / totalFlatsAcrossSocieties) * 100).toFixed(1)
        )
      : 0;

  const effectiveSavingPercent =
    gmvPaise + totalResidentSavingsPaise > 0
      ? Number(
          (
            (totalResidentSavingsPaise /
              (gmvPaise + totalResidentSavingsPaise)) *
            100
          ).toFixed(1)
        )
      : 0;

  // Supplier fill rate
  const supplierMap = new Map<string, SupplierPerformance>();
  let totalOrderedUnits = 0;
  let totalDeliveredUnits = 0;

  for (const po of input.purchaseOrders) {
    const supOrdered = po.items.reduce((s, it) => s + it.orderedQuantity, 0);
    totalOrderedUnits += supOrdered;

    let supDelivered = 0;
    if (po.goodsReceipts.length > 0) {
      for (const gr of po.goodsReceipts) {
        supDelivered += gr.items.reduce((s, it) => s + it.receivedQty, 0);
      }
    } else {
      // If no discrepancy receipts yet, assume fully ordered
      supDelivered = supOrdered;
    }
    totalDeliveredUnits += supDelivered;

    const existing = supplierMap.get(po.supplierId) || {
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      rating: po.supplierRating,
      poCount: 0,
      orderedUnits: 0,
      deliveredUnits: 0,
      fillRatePercent: 100,
      totalWholesalePaise: 0,
    };

    existing.poCount += 1;
    existing.orderedUnits += supOrdered;
    existing.deliveredUnits += supDelivered;
    existing.totalWholesalePaise += po.totalAmountPaise;
    existing.fillRatePercent =
      existing.orderedUnits > 0
        ? Number(
            ((existing.deliveredUnits / existing.orderedUnits) * 100).toFixed(1)
          )
        : 100;

    supplierMap.set(po.supplierId, existing);
  }

  const supplierFillRatePercent =
    totalOrderedUnits > 0
      ? Number(((totalDeliveredUnits / totalOrderedUnits) * 100).toFixed(1))
      : 100;

  // Refund rate
  const totalRefundsPaise = input.refunds.reduce((s, r) => s + r.amountPaise, 0);
  const refundRatePercent =
    gmvPaise > 0
      ? Number(((totalRefundsPaise / gmvPaise) * 100).toFixed(2))
      : 0;

  // Society contributions
  const societies: SocietyContribution[] = input.societies.map((s) => {
    const stats = societyOrderMap.get(s.id) || {
      gmv: 0,
      orders: 0,
      flats: new Set<string>(),
      savings: 0,
    };
    const rate =
      s.flatsCount > 0
        ? Number(((stats.flats.size / s.flatsCount) * 100).toFixed(1))
        : 0;

    return {
      societyId: s.id,
      societyName: s.name,
      joinCode: s.joinCode,
      totalFlats: s.flatsCount,
      participatingFlats: stats.flats.size,
      participationPercent: rate,
      orderCount: stats.orders,
      gmvPaise: stats.gmv,
      residentSavingsPaise: stats.savings,
    };
  });

  return {
    gmvPaise,
    totalOrders: input.orders.length,
    totalParticipatingHouseholds: uniqueFlats.size,
    totalFlatsAcrossSocieties,
    overallParticipationPercent,
    totalResidentSavingsPaise,
    effectiveSavingPercent,
    supplierFillRatePercent,
    totalRefundsPaise,
    refundRatePercent,
    societies,
    suppliers: Array.from(supplierMap.values()),
  };
}

/**
 * Pure function: calculates society admin (RWA committee) analytics
 */
export function computeSocietyAdminAnalytics(input: {
  society: {
    id: string;
    name: string;
    joinCode: string;
    totalFlats: number;
  };
  orders: {
    id: string;
    cycleId: string;
    flatId: string;
    totalGuaranteedPaise: number;
    totalFinalPaise: number | null;
    totalRefundPaise: number;
    items: {
      quantity: number;
      guaranteedPricePaise: number;
      finalPricePaise: number | null;
      benchmarkPricePaise?: number | null;
    }[];
  }[];
  cycles: {
    id: string;
    name: string;
    status: string;
  }[];
  rebatePercent?: number; // default 2%
}): SocietyAdminAnalyticsResult {
  const rebateRate = input.rebatePercent ?? 2.0;
  let gmvPaise = 0;
  let totalUnitsDistributed = 0;
  let priceDropSavingsPaise = 0;
  let retailBenchmarkSavingsPaise = 0;
  const uniqueFlats = new Set<string>();

  const cycleStats = new Map<
    string,
    { gmv: number; orders: number; flats: Set<string>; savings: number }
  >();

  for (const c of input.cycles) {
    cycleStats.set(c.id, {
      gmv: 0,
      orders: 0,
      flats: new Set<string>(),
      savings: 0,
    });
  }

  for (const o of input.orders) {
    const orderGmv = o.totalFinalPaise ?? o.totalGuaranteedPaise;
    gmvPaise += orderGmv;
    uniqueFlats.add(o.flatId);

    const cStat = cycleStats.get(o.cycleId);
    if (cStat) {
      cStat.gmv += orderGmv;
      cStat.orders += 1;
      cStat.flats.add(o.flatId);
    }

    // Price drop savings
    const priceDrop = Math.max(
      0,
      o.totalGuaranteedPaise - (o.totalFinalPaise ?? o.totalGuaranteedPaise)
    );
    priceDropSavingsPaise += priceDrop;
    if (cStat) cStat.savings += priceDrop;

    // Benchmark retail savings & units
    for (const item of o.items) {
      totalUnitsDistributed += item.quantity;
      if (item.benchmarkPricePaise && item.benchmarkPricePaise > 0) {
        const itemPrice = item.finalPricePaise ?? item.guaranteedPricePaise;
        const diff = Math.max(0, item.benchmarkPricePaise - itemPrice);
        const savings = diff * item.quantity;
        retailBenchmarkSavingsPaise += savings;
        if (cStat) cStat.savings += savings;
      }
    }
  }

  const totalResidentSavingsPaise =
    priceDropSavingsPaise + retailBenchmarkSavingsPaise;

  const participationPercent =
    input.society.totalFlats > 0
      ? Number(
          ((uniqueFlats.size / input.society.totalFlats) * 100).toFixed(1)
        )
      : 0;

  // Rebate to Society RWA fund in integer paise
  const societyRebatePaise = Math.round((gmvPaise * rebateRate) / 100);

  const cycles = input.cycles.map((c) => {
    const stat = cycleStats.get(c.id) || {
      gmv: 0,
      orders: 0,
      flats: new Set<string>(),
      savings: 0,
    };
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      gmvPaise: stat.gmv,
      ordersCount: stat.orders,
      participatingFlats: stat.flats.size,
      savingsPaise: stat.savings,
    };
  });

  return {
    societyId: input.society.id,
    societyName: input.society.name,
    joinCode: input.society.joinCode,
    totalFlats: input.society.totalFlats,
    participatingFlats: uniqueFlats.size,
    participationPercent,
    gmvPaise,
    totalOrders: input.orders.length,
    totalUnitsDistributed,
    priceDropSavingsPaise,
    retailBenchmarkSavingsPaise,
    totalResidentSavingsPaise,
    societyRebatePaise,
    cycles,
  };
}

