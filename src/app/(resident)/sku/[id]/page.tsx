import React from "react";
import { prisma } from "@/server/db/client";
import { notFound } from "next/navigation";
import { SkuDetailClient } from "@/components/resident/SkuDetailClient";
import { computeGuaranteedPrice, computePlatformMargin } from "@/server/domain/pricing";

interface SkuDetailPageProps {
  params: { id: string };
}

export default async function SkuDetailPage({ params }: SkuDetailPageProps) {
  const [sku, activeCycle] = await Promise.all([
    prisma.sku.findUnique({
      where: { id: params.id },
      include: {
        product: {
          include: { category: true },
        },
        quotes: {
          where: { isActive: true },
          include: {
            slabs: { orderBy: { minQty: "asc" } },
            supplier: true,
          },
        },
        benchmarkPrices: true,
      },
    }),
    prisma.cycle.findFirst({
      where: { status: "OPEN" },
      include: {
        cycleSkus: {
          where: { skuId: params.id },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!sku) {
    notFound();
  }

  const cycleSku = activeCycle?.cycleSkus[0];
  const currentPooledQty = cycleSku ? cycleSku.pooledQuantity : 0;

  // Derive guaranteed price
  let guaranteedPricePaise = sku.mrpPaise;
  if (cycleSku) {
    guaranteedPricePaise = cycleSku.guaranteedPricePaise;
  } else {
    let lowestSupplierPrice = sku.mrpPaise;
    for (const q of sku.quotes) {
      if (q.slabs.length > 0 && q.slabs[0].supplierPricePaise < lowestSupplierPrice) {
        lowestSupplierPrice = q.slabs[0].supplierPricePaise;
      }
    }
    guaranteedPricePaise = computeGuaranteedPrice(lowestSupplierPrice, {
      marginPercent: Number(sku.marginPercent),
      marginMinPaise: sku.marginMinPaise,
      mrpPaise: sku.mrpPaise,
    });
  }

  // Find lowest price quote or aggregate slabs across suppliers
  const primaryQuote = sku.quotes[0];
  const slabs = (primaryQuote?.slabs || []).map((slab) => {
    const margin = computePlatformMargin(slab.supplierPricePaise, {
      marginPercent: Number(sku.marginPercent),
      marginMinPaise: sku.marginMinPaise,
      mrpPaise: sku.mrpPaise,
    });
    const consumerPricePaise = Math.min(slab.supplierPricePaise + margin, sku.mrpPaise);

    return {
      minQty: slab.minQty,
      maxQty: slab.maxQty,
      supplierPricePaise: slab.supplierPricePaise,
      consumerPricePaise,
    };
  });

  const benchmarks = sku.benchmarkPrices.map((b) => ({
    retailerName: b.retailerName,
    pricePaise: b.pricePaise,
  }));

  const data = {
    id: sku.id,
    variantName: sku.variantName,
    packSize: sku.packSize,
    unit: sku.unit,
    mrpPaise: sku.mrpPaise,
    guaranteedPricePaise,
    product: {
      id: sku.product.id,
      name: sku.product.name,
      brand: sku.product.brand,
      isFood: sku.product.isFood,
      fssaiNumber: sku.product.fssaiNumber,
      category: {
        id: sku.product.category.id,
        name: sku.product.category.name,
      },
    },
    currentPooledQty,
    slabs,
    benchmarks,
    activeCycleName: activeCycle?.name,
    activeCycleLocksAt: activeCycle?.locksAt.toISOString(),
  };

  return <SkuDetailClient data={data} />;
}
