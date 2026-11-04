import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";

export interface UpsertBenchmarkInput {
  actorId: string;
  skuId: string;
  retailerName: string;
  pricePaise: number;
}

export async function listBenchmarkPrices(skuId?: string) {
  const where = skuId ? { skuId } : {};
  return prisma.benchmarkPrice.findMany({
    where,
    include: {
      sku: {
        select: {
          id: true,
          variantName: true,
          unit: true,
          mrpPaise: true,
          product: {
            select: {
              name: true,
              brand: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ skuId: "asc" }, { retailerName: "asc" }],
  });
}

export async function upsertBenchmarkPrice(input: {
  actorId: string;
  skuId: string;
  retailerName: string;
  pricePaise: number;
}) {
  const { actorId, skuId, retailerName, pricePaise } = input;

  if (!Number.isInteger(pricePaise) || pricePaise <= 0) {
    throw new Error("Benchmark price must be a positive integer number of paise.");
  }

  const sku = await prisma.sku.findUnique({
    where: { id: skuId },
  });

  if (!sku) {
    throw new Error("SKU not found.");
  }

  // Rule 10 check: benchmark can be at or below MRP, but not unreasonably higher than MRP
  if (pricePaise > sku.mrpPaise) {
    throw new Error(`Benchmark price cannot exceed SKU MRP of ₹${(sku.mrpPaise / 100).toFixed(2)}.`);
  }

  const existing = await prisma.benchmarkPrice.findFirst({
    where: { skuId, retailerName },
  });

  let benchmark;
  if (existing) {
    benchmark = await prisma.benchmarkPrice.update({
      where: { id: existing.id },
      data: {
        pricePaise,
        checkedAt: new Date(),
      },
    });

    await recordAuditLog({
      actorId,
      action: "BENCHMARK_PRICE_UPDATED",
      entity: "BenchmarkPrice",
      entityId: benchmark.id,
      before: { retailerName, pricePaise: existing.pricePaise },
      after: { retailerName, pricePaise: benchmark.pricePaise },
    });
  } else {
    benchmark = await prisma.benchmarkPrice.create({
      data: {
        skuId,
        retailerName,
        pricePaise,
        checkedAt: new Date(),
      },
    });

    await recordAuditLog({
      actorId,
      action: "BENCHMARK_PRICE_CREATED",
      entity: "BenchmarkPrice",
      entityId: benchmark.id,
      after: { skuId, retailerName, pricePaise },
    });
  }

  return benchmark;
}

export async function getRetailComparison(skuId: string, societyPricePaise: number) {
  const benchmarks = await prisma.benchmarkPrice.findMany({
    where: { skuId },
  });

  if (benchmarks.length === 0) {
    return {
      hasBenchmarks: false,
      benchmarks: [],
      averageBenchmarkPaise: 0,
      savingsVsAveragePaise: 0,
      savingsPercentVsAverage: 0,
    };
  }

  const comparison = benchmarks.map((b) => {
    const diffPaise = Math.max(0, b.pricePaise - societyPricePaise);
    const percent = b.pricePaise > 0 ? Number(((diffPaise / b.pricePaise) * 100).toFixed(1)) : 0;
    return {
      retailerName: b.retailerName,
      pricePaise: b.pricePaise,
      diffPaise,
      percent,
    };
  });

  const avgPrice = Math.round(
    benchmarks.reduce((s, b) => s + b.pricePaise, 0) / benchmarks.length
  );
  const savingsVsAvg = Math.max(0, avgPrice - societyPricePaise);
  const savingsPct = avgPrice > 0 ? Number(((savingsVsAvg / avgPrice) * 100).toFixed(1)) : 0;

  return {
    hasBenchmarks: true,
    benchmarks: comparison,
    averageBenchmarkPaise: avgPrice,
    savingsVsAveragePaise: savingsVsAvg,
    savingsPercentVsAverage: savingsPct,
  };
}
