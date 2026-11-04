"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import { useCart } from "@/components/cart/CartContext";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Wallet,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";

interface CartClientProps {
  walletBalancePaise: number;
  userFlat?: {
    flatNumber: string;
    tower: string | null;
  } | null;
  societyName?: string;
}

export function CartClient({
  walletBalancePaise,
  userFlat,
  societyName,
}: CartClientProps) {
  const router = useRouter();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    totalItemsCount,
    totalGuaranteedPaise,
    totalMrpPaise,
    totalSavingsPaise,
  } = useCart();

  const [useWallet, setUseWallet] = useState(false);

  const walletDeductionPaise = useWallet
    ? Math.min(walletBalancePaise, totalGuaranteedPaise)
    : 0;
  const netPayablePaise = totalGuaranteedPaise - walletDeductionPaise;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-600 mx-auto mb-4">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Your Basket is Empty</h1>
        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
          Add shelf-stable staples to join your housing society pool and unlock wholesale discounts.
        </p>
        <Link
          href="/catalogue"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <span>Explore Staples Catalogue</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/catalogue"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Continue Shopping
        </Link>

        <button
          type="button"
          onClick={clearCart}
          className="text-xs font-semibold text-red-600 hover:text-red-700"
        >
          Clear Basket
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Items List */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <h1 className="text-base font-bold text-gray-900">
              Your Society Pool Basket ({totalItemsCount} items)
            </h1>
            <span className="text-xs font-semibold text-brand-700">
              {societyName || "Housing Society"}
            </span>
          </div>

          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.skuId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs"
              >
                <div className="flex-1 min-w-0">
                  {item.categoryName && (
                    <span className="text-[10px] font-bold uppercase text-brand-700 block">
                      {item.categoryName}
                    </span>
                  )}
                  <h3 className="text-xs font-bold text-gray-900 truncate">
                    {item.productName}
                  </h3>
                  <span className="text-[11px] text-gray-400 block">{item.variantName}</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xs font-black text-gray-900">
                      {formatINR(item.guaranteedPricePaise)}
                    </span>
                    <span className="text-[10px] text-gray-400 line-through">
                      MRP {formatINR(item.mrpPaise)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-0.5 text-xs font-bold text-gray-900">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.skuId, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 shadow-2xs hover:bg-gray-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2 text-xs font-black">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.skuId, item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white shadow-2xs hover:bg-brand-700"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="w-16 text-right text-xs font-black text-gray-900">
                    {formatINR(item.guaranteedPricePaise * item.quantity)}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeItem(item.skuId)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Note */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-600 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
            <p>
              Delivery drops at your society <strong>Clubhouse Drop Point</strong> on the target delivery date. Collect with your QR pickup pass.
            </p>
          </div>
        </div>

        {/* Order Summary & Wallet Deduction */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
              Price Breakdown
            </h2>

            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Total MRP Value</span>
                <span className="line-through">{formatINR(totalMrpPaise)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700">
                <span>Society Wholesale Savings</span>
                <span>-{formatINR(totalSavingsPaise)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Guaranteed Join Total</span>
                <span>{formatINR(totalGuaranteedPaise)}</span>
              </div>

              {/* Wallet Deduction Checkbox */}
              {walletBalancePaise > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <span className="font-bold text-gray-900 flex items-center gap-1">
                        <Wallet className="h-3 w-3 text-brand-600" /> Apply Wallet Balance
                      </span>
                      <span className="text-[11px] text-gray-500 block">
                        Available: {formatINR(walletBalancePaise)}
                      </span>
                    </div>
                  </label>
                  {useWallet && (
                    <div className="flex justify-between font-bold text-brand-700 mt-1 pl-6">
                      <span>Wallet Deduction</span>
                      <span>-{formatINR(walletDeductionPaise)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t border-gray-200">
                <span>Net Payable</span>
                <span>{formatINR(netPayablePaise)}</span>
              </div>
            </div>

            <Link
              href={`/checkout${useWallet ? `?walletPaise=${walletDeductionPaise}` : ""}`}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 active:scale-98 transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <p className="text-[10px] text-gray-400 text-center leading-normal">
              * Any price drops achieved at cycle lock will be auto-credited to your SocietyBuy wallet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

