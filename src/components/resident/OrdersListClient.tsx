"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import { useCart } from "@/components/cart/CartContext";
import { useRouter } from "next/navigation";
import {
  PackageCheck,
  QrCode,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

interface OrderSummaryItem {
  id: string;
  pickupCode: string;
  qrCodeToken: string;
  status: string;
  totalGuaranteedPaise: number;
  totalFinalPaise: number | null;
  totalRefundPaise: number;
  createdAt: string;
  cycle: {
    name: string;
    status: string;
    locksAt: string;
    deliveryTargetDate: string;
  };
  flat: {
    flatNumber: string;
    tower: string | null;
  };
  itemsCount: number;
}

interface OrdersListClientProps {
  orders: OrderSummaryItem[];
  activeCycleId?: string;
}

export function OrdersListClient({ orders, activeCycleId }: OrdersListClientProps) {
  const router = useRouter();
  const { loadItems } = useCart();
  const [reordering, setReordering] = useState(false);
  const [reorderMsg, setReorderMsg] = useState<string | null>(null);

  const handleReorder = async () => {
    if (!activeCycleId) return;
    setReordering(true);
    setReorderMsg(null);

    try {
      const res = await fetch("/api/orders/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId: activeCycleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reorder");

      loadItems(
        data.items.map((i: any) => ({
          skuId: i.skuId,
          productName: i.productName,
          variantName: i.variantName,
          mrpPaise: i.mrpPaise,
          guaranteedPricePaise: i.guaranteedPricePaise,
          quantity: i.quantity,
        }))
      );

      setReorderMsg("Items from previous month added to your basket!");
      router.push("/cart");
    } catch (err: unknown) {
      setReorderMsg(err instanceof Error ? err.message : "Reorder error");
      setReordering(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-[10px] font-bold">Paid & Pooled</span>;
      case "ALLOCATED":
        return <span className="rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-[10px] font-bold">PO Dispatched</span>;
      case "RECEIVED_AT_DROP":
        return <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">Ready to Collect</span>;
      case "HANDED_OVER":
        return <span className="rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-[10px] font-bold">Collected ✓</span>;
      case "CANCELLED":
        return <span className="rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-[10px] font-bold">Cancelled & Refunded</span>;
      default:
        return <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Society Orders</h1>
          <p className="text-xs text-gray-500">
            View order status timeline, QR pickup pass, and price drop refund savings.
          </p>
        </div>

        {orders.length > 0 && activeCycleId && (
          <button
            type="button"
            onClick={handleReorder}
            disabled={reordering}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-50 border border-brand-200 px-4 py-2.5 text-xs font-bold text-brand-800 shadow-2xs hover:bg-brand-100 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{reordering ? "Loading..." : "Reorder Last Month"}</span>
          </button>
        )}
      </div>

      {reorderMsg && (
        <div className="rounded-xl bg-brand-50 p-3 text-xs font-semibold text-brand-800">
          {reorderMsg}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 p-12 text-center text-xs text-gray-500">
          <PackageCheck className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="font-bold text-sm text-gray-800">No orders placed yet</p>
          <p className="mt-1">Join your society&apos;s monthly grocery pool to start saving.</p>
          <Link
            href="/catalogue"
            className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
          >
            Browse Catalogue
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs hover:border-brand-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                    #{order.pickupCode}
                  </span>
                  {getStatusBadge(order.status)}
                  <span className="text-[11px] text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-gray-900">{order.cycle.name}</h3>

                <p className="text-xs text-gray-500">
                  Flat: <strong>{order.flat.tower ? `${order.flat.tower} - ` : ""}Flat {order.flat.flatNumber}</strong> • {order.itemsCount} items
                </p>

                {order.totalRefundPaise > 0 && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <Sparkles className="h-3 w-3 text-emerald-600" />
                    <span>Refund Earned: +{formatINR(order.totalRefundPaise)} in wallet</span>
                  </div>
                )}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 gap-2">
                <div className="text-left sm:text-right">
                  <span className="block text-[10px] text-gray-400 uppercase font-bold">Total Paid</span>
                  <span className="text-base font-black text-gray-900">
                    {formatINR(order.totalFinalPaise ?? order.totalGuaranteedPaise)}
                  </span>
                </div>

                <Link
                  href={`/orders/${order.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-black transition-colors"
                >
                  <QrCode className="h-3.5 w-3.5 text-brand-400" />
                  <span>Pickup Pass & QR</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
