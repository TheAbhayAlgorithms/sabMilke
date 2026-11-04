import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireSupplier } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";
import { QuoteEditorClient } from "@/components/supplier/QuoteEditorClient";

export default async function SupplierQuotesPage() {
  const session = await getCurrentSession();
  requireSupplier(session);

  const supplier = await prisma.supplier.findUnique({
    where: { id: session!.supplierId },
  });

  const rawSkus = await prisma.sku.findMany({
    where: { isActive: true },
    include: {
      product: {
        include: {
          category: true,
        },
      },
      quotes: {
        where: {
          supplierId: session!.supplierId,
          isActive: true,
        },
        include: {
          slabs: {
            orderBy: { minQty: "asc" },
          },
        },
      },
    },
    orderBy: [
      { product: { category: { name: "asc" } } },
      { product: { name: "asc" } },
    ],
  });

  const skus = rawSkus.map((s) => ({
    id: s.id,
    variantName: s.variantName,
    packSize: Number(s.packSize),
    unit: s.unit,
    mrpPaise: s.mrpPaise,
    product: {
      brand: s.product.brand,
      name: s.product.name,
      isFood: s.product.isFood,
      fssaiNumber: s.product.fssaiNumber,
      category: {
        name: s.product.category.name,
      },
    },
    activeQuote: s.quotes[0]
      ? {
          id: s.quotes[0].id,
          moq: s.quotes[0].moq,
          leadTimeDays: s.quotes[0].leadTimeDays,
          validFrom: s.quotes[0].validFrom.toISOString(),
          validTo: s.quotes[0].validTo.toISOString(),
          slabs: s.quotes[0].slabs.map((sl) => ({
            id: sl.id,
            minQty: sl.minQty,
            maxQty: sl.maxQty,
            supplierPricePaise: sl.supplierPricePaise,
          })),
        }
      : null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <QuoteEditorClient
        supplierName={supplier?.name || "Wholesale Supplier"}
        skus={skus}
      />
    </div>
  );
}
