import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";
import { getQuotesComparisonForSku } from "@/server/services/quoteService";
import { formatINR } from "@/lib/money";
import Link from "next/link";
import { ShieldCheck, Truck, Star, ArrowLeft, CheckCircle2 } from "lucide-react";

interface AdminQuotesPageProps {
  searchParams: {
    skuId?: string;
  };
}

export default async function AdminQuotesComparisonPage({ searchParams }: AdminQuotesPageProps) {
  const session = await getCurrentSession();
  requirePlatformAdmin(session);

  // Fetch all SKUs for the dropdown selector
  const allSkus = await prisma.sku.findMany({
    include: {
      product: true,
    },
    orderBy: [
      { product: { brand: "asc" } },
      { product: { name: "asc" } },
    ],
  });

  const selectedSkuId = searchParams.skuId || allSkus[0]?.id;

  let comparisonData = null;
  if (selectedSkuId) {
    try {
      comparisonData = await getQuotesComparisonForSku(selectedSkuId);
    } catch {
      comparisonData = null;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/catalogue"
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Catalogue
            </Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
            Supplier Quotes Comparison
          </h1>
          <p className="text-xs text-gray-500">
            Compare wholesale price slabs, MOQ, lead times, and ratings across suppliers.
          </p>
        </div>

        {/* SKU Selector Dropdown */}
        <form method="GET" action="/admin/quotes" className="w-full sm:w-auto">
          <label className="block text-[11px] font-bold text-gray-700 mb-1">Select SKU to Compare:</label>
          <select
            name="skuId"
            defaultValue={selectedSkuId}
            className="w-full sm:w-72 rounded-xl border border-gray-300 p-2 text-xs font-semibold bg-white shadow-2xs"
          >
            {allSkus.map((s) => (
              <option key={s.id} value={s.id}>
                {s.product.brand} - {s.product.name} ({s.variantName})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="mt-1.5 sm:mt-0 sm:ml-2 rounded-xl bg-purple-700 px-3 py-2 text-xs font-bold text-white hover:bg-purple-800"
          >
            Compare
          </button>
        </form>
      </div>

      {comparisonData ? (
        <div className="space-y-6">
          {/* Selected SKU Metadata Header Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                  {comparisonData.sku.product.category.name}
                </span>
                <h2 className="text-lg font-bold text-gray-900 mt-1">
                  {comparisonData.sku.product.brand} - {comparisonData.sku.product.name} ({comparisonData.sku.variantName})
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-gray-500 block">Maximum Retail Price (MRP)</span>
                <span className="text-xl font-extrabold text-gray-900">
                  {formatINR(comparisonData.sku.mrpPaise)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
              <div>
                <span className="font-semibold block text-gray-800">Pack Details:</span>
                {Number(comparisonData.sku.packSize)} {comparisonData.sku.unit}
              </div>
              <div>
                <span className="font-semibold block text-gray-800">HSN & GST:</span>
                HSN {comparisonData.sku.product.hsnCode} • {Number(comparisonData.sku.product.gstRate)}% GST
              </div>
              <div>
                <span className="font-semibold block text-gray-800">FSSAI Status:</span>
                {comparisonData.sku.product.isFood ? (
                  <span className="text-emerald-700 font-semibold">
                    ✓ Lic: {comparisonData.sku.product.fssaiNumber}
                  </span>
                ) : (
                  <span className="text-gray-400">Non-Food (Exempt)</span>
                )}
              </div>
              <div>
                <span className="font-semibold block text-gray-800">Active Quotes:</span>
                <span className="font-bold text-purple-700">
                  {comparisonData.comparison.length} Wholesale Quotes
                </span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Supplier Quotes Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparisonData.comparison.map((quote, idx) => (
              <div
                key={quote.quoteId}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs flex flex-col justify-between hover:border-purple-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        Quote #{idx + 1}
                      </span>
                      <h3 className="font-bold text-sm text-gray-900 mt-1 flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-gray-600" />
                        {quote.supplierName}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold text-amber-700 border border-amber-200">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {quote.supplierRating.toFixed(1)}
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-500 space-y-0.5 mb-4 border-b border-gray-100 pb-2">
                    <div>GSTIN: {quote.gstin}</div>
                    <div>MOQ: {quote.moq} units • Lead Time: {quote.leadTimeDays} days</div>
                    <div>Valid till: {new Date(quote.validTo).toLocaleDateString("en-IN")}</div>
                  </div>

                  {/* Slabs Ladder */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-800 block">Price Slabs:</span>
                    {quote.slabs.map((slab, sIdx) => (
                      <div
                        key={slab.id}
                        className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 text-xs space-y-1"
                      >
                        <div className="flex justify-between items-center font-bold text-gray-900">
                          <span>
                            Tier {sIdx + 1} ({slab.minQty}{slab.maxQty ? ` - ${slab.maxQty}` : "+"} units)
                          </span>
                          <span className="text-emerald-700 font-extrabold">
                            {formatINR(slab.supplierPricePaise)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-500">
                          <span>Resident Guaranteed Price:</span>
                          <span className="font-semibold text-gray-800">
                            {formatINR(slab.residentPricePaise)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-emerald-600">
                          <span>Savings vs MRP:</span>
                          <span>
                            {formatINR(slab.savingsPaise)} ({slab.savingsPercent}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Verified Rule 10: Below MRP
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
          No active quotes found for this SKU.
        </div>
      )}
    </div>
  );
}
