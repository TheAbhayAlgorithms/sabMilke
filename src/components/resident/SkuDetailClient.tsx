"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import { useCart } from "@/components/cart/CartContext";
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  TrendingDown,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
} from "lucide-react";

interface SlabItem {
  minQty: number;
  maxQty: number | null;
  supplierPricePaise: number;
  consumerPricePaise: number;
}

interface BenchmarkItem {
  retailerName: string;
  pricePaise: number;
}

interface SkuDetailData {
  id: string;
  variantName: string;
  packSize: number;
  unit: string;
  mrpPaise: number;
  guaranteedPricePaise: number;
  product: {
    id: string;
    name: string;
    brand: string;
    isFood: boolean;
    fssaiNumber: string | null;
    category: {
      id: string;
      name: string;
    };
  };
  currentPooledQty: number;
  slabs: SlabItem[];
  benchmarks: BenchmarkItem[];
  activeCycleName?: string;
  activeCycleLocksAt?: string;
}

export function SkuDetailClient({ data }: { data: SkuDetailData }) {
  const { items, addItem, updateQuantity } = useCart();
  const [selectedQty, setSelectedQty] = useState(1);

  const cartItem = items.find((i) => i.skuId === data.id);
  const cartQty = cartItem ? cartItem.quantity : 0;

  // Find reached slab based on current pooled quantity
  let reachedSlabIndex = 0;
  for (let idx = 0; idx < data.slabs.length; idx++) {
    const sl = data.slabs[idx];
    if (data.currentPooledQty >= sl.minQty) {
      reachedSlabIndex = idx;
    }
  }

  const reachedSlab = data.slabs[reachedSlabIndex];
  const nextSlab = data.slabs[reachedSlabIndex + 1];
  const unitsNeededForNext = nextSlab ? Math.max(0, nextSlab.minQty - data.currentPooledQty) : null;

  // Benchmark savings comparison
  const avgBenchmarkPaise =
    data.benchmarks.length > 0
      ? Math.round(
          data.benchmarks.reduce((s, b) => s + b.pricePaise, 0) / data.benchmarks.length
        )
      : Math.round(data.mrpPaise * 0.95);

  const savingsVsBenchmark = Math.max(0, avgBenchmarkPaise - data.guaranteedPricePaise);

  const handleAddToCart = () => {
    addItem(
      {
        skuId: data.id,
        productName: `${data.product.brand} - ${data.product.name}`,
        variantName: data.variantName,
        mrpPaise: data.mrpPaise,
        guaranteedPricePaise: data.guaranteedPricePaise,
        categoryName: data.product.category.name,
      },
      selectedQty
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Back Link */}
      <div className="mb-4">
        <Link
          href="/catalogue"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Catalogue
        </Link>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm space-y-6">
        {/* Product Details Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
              {data.product.category.name}
            </span>
            {data.product.isFood && data.product.fssaiNumber && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <ShieldCheck className="h-3 w-3" /> FSSAI: {data.product.fssaiNumber}
              </span>
            )}
          </div>

          <span className="text-sm font-bold text-gray-500 block">{data.product.brand}</span>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
            {data.product.name}
          </h1>
          <p className="text-xs text-gray-500 mt-1">Pack Size: {data.variantName} ({data.packSize} {data.unit})</p>

          {/* Pricing Banner */}
          <div className="mt-4 flex flex-wrap items-baseline gap-3 rounded-2xl bg-gray-50 p-4 border border-gray-100">
            <div>
              <span className="block text-[10px] font-bold uppercase text-gray-400">Guaranteed Join Price</span>
              <span className="text-2xl font-black text-gray-900">{formatINR(data.guaranteedPricePaise)}</span>
            </div>
            <div className="border-l border-gray-200 pl-3">
              <span className="block text-[10px] font-bold uppercase text-gray-400">MRP</span>
              <span className="text-base font-semibold text-gray-400 line-through">{formatINR(data.mrpPaise)}</span>
            </div>
            <div className="border-l border-gray-200 pl-3">
              <span className="block text-[10px] font-bold uppercase text-gray-400">Unit Price</span>
              <span className="text-xs font-bold text-gray-700">
                {formatINR(Math.round(data.guaranteedPricePaise / data.packSize))}/{data.unit}
              </span>
            </div>
            <div className="ml-auto">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                Save {Math.round(((data.mrpPaise - data.guaranteedPricePaise) / data.mrpPaise) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Live Society Tier Ladder Engine */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white font-bold">
                <TrendingDown className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Live Society Discount Ladder</h3>
                <p className="text-[11px] text-gray-500">
                  Currently <strong>{data.currentPooledQty} units</strong> pooled across your society.
                </p>
              </div>
            </div>

            {unitsNeededForNext !== null && (
              <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs">
                {unitsNeededForNext} more to drop price!
              </span>
            )}
          </div>

          {/* Tier Steps */}
          <div className="space-y-2">
            {data.slabs.map((slab, idx) => {
              const isCurrent = idx === reachedSlabIndex;
              const isUnlocked = idx <= reachedSlabIndex;

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                    isCurrent
                      ? "border-brand-500 bg-white shadow-xs font-bold ring-2 ring-brand-200"
                      : isUnlocked
                      ? "border-gray-200 bg-white/60 text-gray-700"
                      : "border-dashed border-gray-200 bg-gray-50/60 text-gray-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        isUnlocked ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-gray-900">
                        Tier {idx + 1}: {slab.minQty}{slab.maxQty ? ` - ${slab.maxQty}` : "+"} units
                      </span>
                      {isCurrent && (
                        <span className="block text-[10px] font-semibold text-brand-700">
                          Active Tier (Current Price at Lock)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-black ${isCurrent ? "text-brand-700" : "text-gray-900"}`}>
                      {formatINR(slab.consumerPricePaise)}
                    </span>
                    <span className="block text-[10px] text-gray-400">
                      Save {Math.round(((data.mrpPaise - slab.consumerPricePaise) / data.mrpPaise) * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed">
            * You pay the guaranteed join price today. When the cycle locks, the final price is recomputed based on total society orders. Any price difference is automatically refunded to your SocietyBuy wallet.
          </p>
        </div>

        {/* Quick Commerce Benchmark Price Comparison */}
        {data.benchmarks.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Retail Benchmark Price Comparison
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-2 font-bold">
                <span className="block text-[10px] text-brand-700">SocietyBuy</span>
                <span className="text-sm font-black text-brand-900">{formatINR(data.guaranteedPricePaise)}</span>
              </div>
              {data.benchmarks.map((bm, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-2">
                  <span className="block text-[10px] text-gray-500">{bm.retailerName}</span>
                  <span className="text-sm font-semibold text-gray-700 line-through">{formatINR(bm.pricePaise)}</span>
                </div>
              ))}
            </div>
            {savingsVsBenchmark > 0 && (
              <p className="text-[11px] text-emerald-700 font-semibold text-center mt-2">
                You save ~{formatINR(savingsVsBenchmark)} per pack compared to instant delivery apps!
              </p>
            )}
          </div>
        )}

        {/* Action Controls: Quantity & Add to Cart */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center rounded-2xl border border-gray-300 bg-gray-50 p-1 text-sm font-bold">
            <button
              type="button"
              onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-700 shadow-2xs hover:bg-gray-100 active:scale-95"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-4 text-base font-black text-gray-900">{selectedQty}</span>
            <button
              type="button"
              onClick={() => setSelectedQty(selectedQty + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-700 shadow-2xs hover:bg-gray-100 active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 px-6 text-sm font-bold text-white shadow-sm hover:bg-brand-700 active:scale-98 transition-all"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Add {selectedQty} to Basket • {formatINR(data.guaranteedPricePaise * selectedQty)}</span>
          </button>
        </div>

        {cartQty > 0 && (
          <div className="text-center">
            <span className="text-xs font-semibold text-brand-700">
              ✓ {cartQty} of this item currently in your basket.{" "}
              <Link href="/cart" className="underline font-bold">
                View Cart →
              </Link>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

