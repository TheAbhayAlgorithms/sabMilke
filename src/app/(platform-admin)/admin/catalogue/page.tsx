import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";
import { CatalogueManagerClient } from "@/components/admin/CatalogueManagerClient";

export default async function AdminCataloguePage() {
  const session = await getCurrentSession();
  requirePlatformAdmin(session);

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  const rawSkus = await prisma.sku.findMany({
    include: {
      product: {
        include: {
          category: true,
        },
      },
      quotes: {
        where: { isActive: true },
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
      id: s.product.id,
      brand: s.product.brand,
      name: s.product.name,
      isFood: s.product.isFood,
      fssaiNumber: s.product.fssaiNumber,
      hsnCode: s.product.hsnCode,
      gstRate: Number(s.product.gstRate),
      category: {
        name: s.product.category.name,
      },
    },
    quotesCount: s.quotes.length,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <CatalogueManagerClient categories={categories} initialSkus={skus} />
    </div>
  );
}

