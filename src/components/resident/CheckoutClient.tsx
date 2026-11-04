"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatINR } from "@/lib/money";
import { useCart } from "@/components/cart/CartContext";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  CreditCard,
  Building2,
  Lock,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface CheckoutClientProps {
  society: {
    id: string;
    name: string;
    dropPointName: string;
    dropPointInstructions: string | null;
  };
  cycle: {
    id: string;
    name: string;
    locksAt: string;
    deliveryTargetDate: string;
  };
  flat: {
    id: string;
    flatNumber: string;
    tower: string | null;
  };
  walletBalancePaise: number;
}

export function CheckoutClient({
  society,
  cycle,
  flat,
  walletBalancePaise,
}: CheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const walletParam = searchParams.get("walletPaise");
  const initialWalletDeduction = walletParam ? parseInt(walletParam, 10) : 0;

  const { items, totalGuaranteedPaise, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<"UPI_INTENT" | "UPI_COLLECT" | "CARD">("UPI_INTENT");
  const [upiVpa, setUpiVpa] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletDeductionPaise = Math.min(initialWalletDeduction, walletBalancePaise, totalGuaranteedPaise);
  const netPayablePaise = totalGuaranteedPaise - walletDeductionPaise;

  const handlePlaceOrderAndPay = async (simulateFailure = false) => {
    if (items.length === 0) {
      setError("Basket is empty. Add staples before checkout.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create Order via Service API
      const createRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          societyId: society.id,
          cycleId: cycle.id,
          flatId: flat.id,
          items: items.map((i) => ({ skuId: i.skuId, quantity: i.quantity })),
          useWalletPaise: walletDeductionPaise,
          paymentMethod,
        }),
      });

      const orderData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(orderData.error || "Failed to place order.");
      }

      const orderId = orderData.order.id;

      // 2. If net payable is > 0, complete payment (mock adapter or razorpay)
      if (netPayablePaise > 0) {
        if (simulateFailure) {
          throw new Error("Simulated payment rejection from UPI gateway.");
        }

        const payRes = await fetch(`/api/orders/${orderId}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerPaymentId: `mock_pay_${Date.now()}`,
            paymentMethod,
            upiVpa: upiVpa || "resident@okhdfcbank",
          }),
        });

        const payData = await payRes.json();
        if (!payRes.ok) {
          throw new Error(payData.error || "Payment confirmation failed.");
        }
      }

      // 3. Clear cart and redirect to Order Pickup Pass
      clearCart();
      router.push(`/orders/${orderId}?success=true`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout error occurred.");
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-xs text-gray-500">Your basket is empty.</p>
        <Link href="/catalogue" className="mt-3 inline-block font-bold text-xs text-brand-700 underline">
          Return to Catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/cart" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Basket
        </Link>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Society Pool Checkout</h1>
          <p className="text-xs text-gray-500 mt-1">
            Pay the guaranteed price today. Any wholesale volume discount is credited back at lock time.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div>
              <span className="font-bold block">Checkout Notice:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Drop Point & Flat Delivery Summary */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-brand-900">
            <Building2 className="h-4 w-4 text-brand-700" />
            <span>Delivery Destination: {society.name}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700 pt-1">
            <div>
              <span className="text-[10px] text-gray-500 block uppercase">Your Registered Flat</span>
              <span className="font-bold text-gray-900">
                {flat.tower ? `${flat.tower} - ` : ""}Flat {flat.flatNumber}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase">Drop Point</span>
              <span className="font-bold text-gray-900">{society.dropPointName}</span>
            </div>
          </div>
          {society.dropPointInstructions && (
            <p className="text-[11px] text-gray-500 italic pt-1 border-t border-brand-100">
              Note: {society.dropPointInstructions}
            </p>
          )}
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Select UPI / Payment Method
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod("UPI_INTENT")}
              className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                paymentMethod === "UPI_INTENT"
                  ? "border-brand-600 bg-brand-50/70 text-brand-900 shadow-2xs ring-2 ring-brand-200"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <QrCode className="h-5 w-5 mb-1.5 text-brand-600" />
              <span>UPI Intent / QR</span>
              <span className="text-[10px] text-gray-400 font-normal">GPay, PhonePe, Paytm</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("UPI_COLLECT")}
              className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                paymentMethod === "UPI_COLLECT"
                  ? "border-brand-600 bg-brand-50/70 text-brand-900 shadow-2xs ring-2 ring-brand-200"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-base font-black mb-0.5 text-brand-700 font-mono">@upi</span>
              <span>UPI ID (VPA)</span>
              <span className="text-[10px] text-gray-400 font-normal">Collect request</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("CARD")}
              className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                paymentMethod === "CARD"
                  ? "border-brand-600 bg-brand-50/70 text-brand-900 shadow-2xs ring-2 ring-brand-200"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <CreditCard className="h-5 w-5 mb-1.5 text-gray-600" />
              <span>Card / NetBanking</span>
              <span className="text-[10px] text-gray-400 font-normal">RuPay, Visa, MC</span>
            </button>
          </div>

          {paymentMethod === "UPI_COLLECT" && (
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Enter your UPI ID / VPA</label>
              <input
                type="text"
                value={upiVpa}
                onChange={(e) => setUpiVpa(e.target.value)}
                placeholder="e.g. mobile@okaxis or name@okhdfcbank"
                className="w-full rounded-xl border border-gray-300 p-2 text-xs font-medium text-gray-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Price Breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Guaranteed Pool Value ({items.length} items)</span>
            <span className="font-semibold">{formatINR(totalGuaranteedPaise)}</span>
          </div>
          {walletDeductionPaise > 0 && (
            <div className="flex justify-between font-bold text-brand-700">
              <span>Applied Wallet Credit</span>
              <span>-{formatINR(walletDeductionPaise)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
            <span>Net Amount to Pay</span>
            <span>{formatINR(netPayablePaise)}</span>
          </div>
        </div>

        {/* Payment CTA */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handlePlaceOrderAndPay(false)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 active:scale-98 transition-all"
          >
            <Lock className="h-4 w-4" />
            <span>
              {loading
                ? "Processing Order..."
                : netPayablePaise === 0
                ? "Confirm Order with Wallet Balance"
                : `Pay ${formatINR(netPayablePaise)} via UPI`}
            </span>
          </button>

          <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>100% Secure Indian Housing Society Pooling • Test Razorpay Mode</span>
          </p>
        </div>
      </div>
    </div>
  );
}

