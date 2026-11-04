import React from "react";
import { prisma } from "@/server/db/client";
import { CatalogueClient, CatalogueSkuItem } from "@/components/resident/CatalogueClient";
import { computeGuaranteedPrice } from "@/server/domain/pricing";

export default async function CataloguePage() {
  const [categories, rawSkus, activeCycle] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.sku.findMany({
      where: { isActive: true },
      include: {
        product: {
          include: { category: true },
        },
        quotes: {
          where: { isActive: true },
          include: {
            slabs: { orderBy: { minQty: "asc" } },
          },
        },
      },
      orderBy: [
        { product: { category: { name: "asc" } } },
        { product: { name: "asc" } },
      ],
    }),
    prisma.cycle.findFirst({
      where: { status: "OPEN" },
      include: { cycleSkus: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const cycleSkuMap = new Map(
    activeCycle ? activeCycle.cycleSkus.map((cs) => [cs.skuId, cs]) : []
  );

  const skus: CatalogueSkuItem[] = rawSkus.map((sku) => {
    // 1. Guaranteed price: check if cycle has computed price, or derive from lowest Tier 1 quote
    let guaranteedPricePaise = sku.mrpPaise;
    const cycleSku = cycleSkuMap.get(sku.id);

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

    let lowestWholesalePaise = sku.mrpPaise;
    for (const q of sku.quotes) {
      for (const sl of q.slabs) {
        if (sl.supplierPricePaise < lowestWholesalePaise) {
          lowestWholesalePaise = sl.supplierPricePaise;
        }
      }
    }

    return {
      id: sku.id,
      variantName: sku.variantName,
      packSize: sku.packSize,
      unit: sku.unit,
      mrpPaise: sku.mrpPaise,
      guaranteedPricePaise,
      imageUrl: sku.imageUrl,
      product: {
        id: sku.product.id,
        name: sku.product.name,
        brand: sku.product.brand,
        isFood: sku.product.isFood,
        fssaiNumber: sku.product.fssaiNumber,
        category: {
          id: sku.product.category.id,
          name: sku.product.category.name,
          slug: sku.product.category.slug,
        },
      },
      quotesCount: sku.quotes.length,
      lowestWholesalePaise,
    };
  });

  return (
    <CatalogueClient
      skus={skus}
      categories={categories}
      activeCycleName={activeCycle?.name}
      activeCycleLocksAt={activeCycle?.locksAt.toISOString()}
    />
  );
}
