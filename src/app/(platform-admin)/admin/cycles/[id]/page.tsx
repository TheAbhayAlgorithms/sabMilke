import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";
import { formatINR } from "@/lib/money";
import { computeNextTierProgress } from "@/server/domain/pricing";
import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle2, TrendingDown, Truck, Users } from "lucide-react";

interface AdminCycleDetailProps {
  params: { id: string };
}

export default async function AdminCycleDetailPage({ params }: AdminCycleDetailProps) {
  const session = await getCurrentSession();
  requirePlatformAdmin(session);

  const cycle = await prisma.cycle.findUnique({
    where: { id: params.id },
    include: {
      society: true,
      orders: {
        where: { status: { in: ["PAID", "CONFIRMED", "ALLOCATED"] } },
        include: { items: true },
      },
      cycleSkus: {
        include: {
          sku: {
            include: {
              product: {
                include: { category: true },
              },
              quotes: {
                where: { isActive: true },
                include: {
                  supplier: true,
                  slabs: { orderBy: { minQty: "asc" } },
                },
              },
            },
          },
        },
        orderBy: [
          { sku: { product: { category: { name: "asc" } } } },
          { sku: { product: { name: "asc" } } },
        ],
      },
    },
  });

  if (!cycle) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center text-xs text-gray-500">
        Cycle not found.
      </div>
    );
  }

  const totalValuePaise = cycle.orders.reduce((sum, o) => sum + o.totalGuaranteedPaise, 0);
  const totalRefundPaise = cycle.orders.reduce((sum, o) => sum + (o.totalRefundPaise || 0), 0);
  const uniqueHouseholds = new Set(cycle.orders.map((o) => o.flatId)).size;
  const totalPooledUnits = cycle.cycleSkus.reduce((sum, cs) => sum + cs.pooledQuantity, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Navigation Header */}
      <div className="mb-4">
        <Link
          href="/admin/cycles"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Cycles Manager
        </Link>
      </div>

      {/* Cycle Overview Card */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-900 to-indigo-950 p-6 text-white shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-800/60 px-3 py-1 text-xs font-semibold text-purple-200 backdrop-blur-xs mb-2">
              <RefreshCw className="h-3.5 w-3.5" />
              {cycle.society.name} • {cycle.status}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">{cycle.name}</h1>
            <p className="text-xs text-purple-200 mt-1">
              Locks: {new Date(cycle.locksAt).toLocaleDateString("en-IN")} • Delivers: {new Date(cycle.deliveryTargetDate).toLocaleDateString("en-IN")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                cycle.status === "OPEN"
                  ? "bg-emerald-500 text-white"
                  : cycle.status === "LOCKED"
                  ? "bg-blue-500 text-white"
                  : cycle.status === "CANCELLED"
                  ? "bg-red-500 text-white"
                  : "bg-gray-700 text-white"
              }`}
            >
              Status: {cycle.status}
            </span>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-purple-800/50 pt-4 text-center">
          <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-700/30">
            <span className="block text-[11px] text-purple-200">Total Society GMV</span>
            <span className="text-base sm:text-lg font-bold">{formatINR(totalValuePaise)}</span>
          </div>
          <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-700/30">
            <span className="block text-[11px] text-purple-200">Participating Flats</span>
            <span className="text-base sm:text-lg font-bold">
              {uniqueHouseholds} / {cycle.minHouseholds} min
            </span>
          </div>
          <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-700/30">
            <span className="block text-[11px] text-purple-200">Total Pooled Units</span>
            <span className="text-base sm:text-lg font-bold">{totalPooledUnits}</span>
          </div>
          <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-700/30">
            <span className="block text-[11px] text-purple-200">Total Price Drop Refunds</span>
            <span className="text-base sm:text-lg font-bold text-emerald-400">
              {formatINR(totalRefundPaise)}
            </span>
          </div>
        </div>
      </div>

      {/* Live Per-SKU Pooled Quantities and Reached Slabs Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Live Pooled SKU Demands & Discount Tiers
            </h2>
            <p className="text-xs text-gray-500">
              Tracking pooled society volume across 25 staple SKUs. Slabs advance automatically as residents order.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-700 uppercase">
              <tr>
                <th className="px-4 py-3">Category & Staple</th>
                <th className="px-4 py-3">Pooled Qty</th>
                <th className="px-4 py-3">Guaranteed (Join)</th>
                <th className="px-4 py-3">Slab Reached</th>
                <th className="px-4 py-3">Winning / Leading Quote</th>
                <th className="px-4 py-3">Final Price</th>
                <th className="px-4 py-3 text-right">Refund Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {cycle.cycleSkus.map((cs) => {
                // Find primary or chosen quote
                const chosenQuote = cs.chosenSupplierQuoteId
                  ? cs.sku.quotes.find((q) => q.id === cs.chosenSupplierQuoteId)
                  : cs.sku.quotes[0];

                const slabs = chosenQuote?.slabs.map((s) => ({
                  minQty: s.minQty,
                  maxQty: s.maxQty,
                  supplierPricePaise: s.supplierPricePaise,
                })) || [];

                let progress = null;
                if (slabs.length > 0) {
                  progress = computeNextTierProgress(slabs, cs.pooledQuantity, {
                    marginPercent: Number(cs.sku.marginPercent),
                    marginMinPaise: cs.sku.marginMinPaise,
                    mrpPaise: cs.sku.mrpPaise,
                  });
                }

                const refundDelta = cs.finalPricePaise
                  ? Math.max(0, cs.guaranteedPricePaise - cs.finalPricePaise)
                  : 0;

                return (
                  <tr key={cs.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                        {cs.sku.product.category.name}
                      </span>
                      <div className="font-bold text-gray-900 mt-0.5">
                        {cs.sku.product.brand} {cs.sku.product.name}
                      </div>
                      <div className="text-[11px] text-gray-400">{cs.sku.variantName}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-block rounded-lg bg-purple-50 px-2 py-1 text-xs font-bold text-purple-900 border border-purple-200">
                        {cs.pooledQuantity} units
                      </span>
                    </td>

                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatINR(cs.guaranteedPricePaise)}
                      <span className="text-[10px] text-gray-400 block">MRP {formatINR(cs.sku.mrpPaise)}</span>
                    </td>

                    <td className="px-4 py-3">
                      {progress ? (
                        <div>
                          <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                            Tier {progress.currentTierIndex + 1} ({progress.currentSlab.minQty}{progress.currentSlab.maxQty ? `-${progress.currentSlab.maxQty}` : "+"} units)
                          </span>
                          {progress.nextSlab && (
                            <span className="block text-[10px] text-brand-700 mt-0.5">
                              Need {progress.unitsNeededForNextTier} more to reach Tier {progress.currentTierIndex + 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {chosenQuote ? (
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-1">
                            <Truck className="h-3 w-3 text-blue-600" />
                            {chosenQuote.supplier.name}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            ★ {Number(chosenQuote.supplier.rating).toFixed(1)} • MOQ {chosenQuote.moq}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No quotes</span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-bold text-gray-900">
                      {cs.finalPricePaise ? formatINR(cs.finalPricePaise) : formatINR(cs.guaranteedPricePaise)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {refundDelta > 0 ? (
                        <div>
                          <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                            - {formatINR(refundDelta)}/unit
                          </span>
                          <span className="block text-[10px] text-gray-500 mt-0.5">
                            Total: {formatINR(refundDelta * cs.pooledQuantity)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-semibold">₹0 (Base Tier)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
