"use client";

import React from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import { PiggyBank, TrendingDown, Sparkles, ShoppingBag, ArrowLeft, Building2 } from "lucide-react";

interface CycleSavingsBreakdown {
  cycleId: string;
  cycleName: string;
  spentPaise: number;
  mrpPaise: number;
  savingsPaise: number;
  refundsPaise: number;
  itemsCount: number;
}

interface SavingsClientProps {
  savingsData: {
    totalOrdersCount: number;
    totalSpentPaise: number;
    totalMrpPaise: number;
    totalSavingsVsMrpPaise: number;
    totalSavingsVsQuickCommercePaise: number;
    savingsPercentVsMrp: number;
    totalRefundsEarnedPaise: number;
    cycleBreakdown: CycleSavingsBreakdown[];
  };
  userName: string;
}

export function SavingsClient({ savingsData, userName }: SavingsClientProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
      </div>

      {/* Savings Hero Banner */}
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-600 via-brand-700 to-emerald-900 p-6 text-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-xs">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200 block">
                Lifetime Group-Buying Savings
              </span>
              <h1 className="text-sm font-bold text-white">{userName}</h1>
            </div>
          </div>

          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white backdrop-blur-xs">
            {savingsData.savingsPercentVsMrp}% Lower than MRP
          </span>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <span className="text-xs text-amber-100 block">Total Money Saved vs MRP</span>
            <span className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {formatINR(savingsData.totalSavingsVsMrpPaise)}
            </span>
          </div>

          <div className="flex flex-col sm:items-end text-xs text-amber-100">
            <span>Vs Instant Delivery (Zepto/Blinkit):</span>
            <span className="text-lg font-bold text-white">
              Saved ~{formatINR(savingsData.totalSavingsVsQuickCommercePaise)}
            </span>
          </div>
        </div>

        {/* Aggregate summary grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-white/20 pt-4 text-center">
          <div className="bg-black/10 p-2.5 rounded-2xl">
            <span className="block text-[11px] text-amber-100">Total Spent</span>
            <span className="text-base font-bold">{formatINR(savingsData.totalSpentPaise)}</span>
          </div>
          <div className="bg-black/10 p-2.5 rounded-2xl">
            <span className="block text-[11px] text-amber-100">Total Retail MRP Value</span>
            <span className="text-base font-bold line-through text-amber-200">{formatINR(savingsData.totalMrpPaise)}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-black/10 p-2.5 rounded-2xl">
            <span className="block text-[11px] text-amber-100">Price Drop Refunds Earned</span>
            <span className="text-base font-bold text-emerald-300">+{formatINR(savingsData.totalRefundsEarnedPaise)}</span>
          </div>
        </div>
      </div>

      {/* Prominent Retail Savings Banner */}
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-lg">
            ₹
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-emerald-950">
              You saved {formatINR(savingsData.totalSavingsVsQuickCommercePaise)} versus nearby retail
            </h2>
            <p className="text-xs text-emerald-700">
              Compared to live retail benchmarks across Zepto, Blinkit, BigBasket & local kiranas.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs">
          Verified Savings
        </span>
      </div>

      {/* Monthly Cycle History */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
          Savings by Monthly Pool
        </h2>

        {savingsData.cycleBreakdown.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No past completed cycles yet. Your monthly savings history will appear here once orders lock!
          </div>
        ) : (
          <div className="space-y-3">
            {savingsData.cycleBreakdown.map((cycle) => (
              <div
                key={cycle.cycleId}
                className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{cycle.cycleName}</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {cycle.itemsCount} staple units purchased
                  </p>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Spent</span>
                    <span className="font-bold text-gray-900">{formatINR(cycle.spentPaise)}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold">MRP Value</span>
                    <span className="text-gray-400 line-through">{formatINR(cycle.mrpPaise)}</span>
                  </div>

                  <div className="pl-3 border-l border-gray-200">
                    <span className="block text-[10px] text-emerald-700 uppercase font-bold">You Saved</span>
                    <span className="text-sm font-black text-emerald-700">+{formatINR(cycle.savingsPaise)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

