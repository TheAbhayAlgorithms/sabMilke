"use client";

import React from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import { Wallet, Sparkles, TrendingUp, ArrowLeft, ArrowUpRight, ArrowDownLeft, ShieldCheck } from "lucide-react";

interface WalletTxItem {
  id: string;
  amountPaise: number;
  type: string;
  referenceId: string | null;
  description: string;
  createdAt: string;
}

interface WalletClientProps {
  balancePaise: number;
  transactions: WalletTxItem[];
  userName: string;
}

export function WalletClient({ balancePaise, transactions, userName }: WalletClientProps) {
  const getTxTypeBadge = (type: string, amountPaise: number) => {
    switch (type) {
      case "PRICE_DELTA_CREDIT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
            <Sparkles className="h-3 w-3" /> Price Drop Saving
          </span>
        );
      case "CANCELLATION_REFUND":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-[10px] font-bold">
            Pool Cancellation Refund
          </span>
        );
      case "ORDER_PAYMENT":
      case "WALLET_SPEND":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-[10px] font-bold">
            Spent on Order
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-[10px] font-bold">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
      </div>

      {/* Wallet Balance Card */}
      <div className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-700 to-emerald-900 p-6 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-xs">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-200 block">
                SocietyBuy Resident Wallet
              </span>
              <h1 className="text-sm font-bold text-white">{userName}</h1>
            </div>
          </div>

          <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
            Auto-Applied at Checkout
          </span>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <span className="text-xs text-brand-200 block">Available Balance</span>
            <span className="text-3xl sm:text-4xl font-black tracking-tight">{formatINR(balancePaise)}</span>
          </div>

          <p className="text-[11px] text-brand-200/90 max-w-xs leading-normal">
            Earned from group-buying volume discounts. Automatically redeemable on your next monthly cycle.
          </p>
        </div>
      </div>

      {/* Transactions Ledger */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Wallet Activity & Savings Ledger</h2>
            <p className="text-xs text-gray-500">Every price drop refund and checkout spend is recorded here.</p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No transactions yet. Volume discount refunds will appear here once your society cycles lock!
          </div>
        ) : (
          <div className="divide-y divide-gray-100 text-xs">
            {transactions.map((tx) => {
              const isCredit = tx.amountPaise > 0;

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                        isCredit ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        {getTxTypeBadge(tx.type, tx.amountPaise)}
                        <span className="text-[10px] text-gray-400">
                          {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-900 block">{tx.description}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-black ${
                        isCredit ? "text-emerald-700" : "text-gray-900"
                      }`}
                    >
                      {isCredit ? "+" : ""}{formatINR(tx.amountPaise)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
