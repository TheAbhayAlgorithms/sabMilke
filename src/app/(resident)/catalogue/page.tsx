import React from "react";
import { prisma } from "@/server/db/client";
import { formatINR } from "@/lib/money";

export default async function CataloguePage() {
  const skus = await prisma.sku.findMany({
    where: { isActive: true },
    include: {
      product: {
        include: {
          category: true,
        },
      },
      quotes: {
        where: { isActive: true },
        include: {
          slabs: {
            orderBy: { minQty: "asc" },
          },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Society Monthly Catalogue</h1>
        <p className="text-xs text-gray-500">25 wholesale staples eligible for pooled discounts.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {skus.map((sku) => {
          const firstQuote = sku.quotes[0];
          const bestSlab = firstQuote?.slabs[firstQuote.slabs.length - 1];

          return (
            <div key={sku.id} id={`sku-${sku.id}`} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                {sku.product.category.name}
              </span>
              <h3 className="font-bold text-sm text-gray-900 mt-1">
                {sku.product.brand} - {sku.product.name}
              </h3>
              <p className="text-xs text-gray-500">{sku.variantName}</p>

              {sku.product.isFood && sku.product.fssaiNumber && (
                <div className="mt-1 text-[10px] text-gray-400">
                  FSSAI Lic: {sku.product.fssaiNumber}
                </div>
              )}

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-base font-extrabold text-gray-900">
                  {bestSlab ? formatINR(Math.round(bestSlab.supplierPricePaise * 1.05)) : formatINR(sku.mrpPaise)}
                </span>
                <span className="text-xs text-gray-400 line-through">
                  MRP {formatINR(sku.mrpPaise)}
                </span>
              </div>

              {firstQuote && (
                <div className="mt-3 border-t border-gray-100 pt-2 text-[11px] text-gray-600">
                  <span className="font-semibold text-gray-700">Discount Ladder:</span>
                  <div className="space-y-0.5 mt-1">
                    {firstQuote.slabs.map((slab) => (
                      <div key={slab.id} className="flex justify-between">
                        <span>{slab.minQty}{slab.maxQty ? `-${slab.maxQty}` : "+"} units:</span>
                        <span className="font-semibold text-brand-700">
                          {formatINR(Math.round(slab.supplierPricePaise * 1.05))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

