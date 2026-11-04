"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Package,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface HandoverItem {
  id: string;
  skuId: string;
  quantity: number;
  shortSuppliedQty: number;
  sku: {
    product: {
      brand: string;
      name: string;
    };
    variantName: string;
    unit: string;
  };
}

interface HandoverOrder {
  id: string;
  pickupCode: string;
  qrCodeToken: string;
  status: string;
  societyId: string;
  user: {
    name: string | null;
    phone: string;
  };
  flat: {
    flatNumber: string;
    tower: string | null;
  };
  cycle: {
    id: string;
    name: string;
  };
  items: HandoverItem[];
  handoverEvents: {
    id: string;
    collectedAt: string | Date;
    isPartial: boolean;
    handedOverBy: {
      name: string | null;
      phone: string;
    };
  }[];
}

export function HandoverClient({ defaultSocietyId }: { defaultSocietyId?: string }) {
  const [code, setCode] = useState("");
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submittingHandover, setSubmittingHandover] = useState(false);
  const [order, setOrder] = useState<HandoverOrder | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [handoverNotes, setHandoverNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;

    setLoadingLookup(true);
    setError(null);
    setMessage(null);
    setOrder(null);

    try {
      const res = await fetch("/api/captain/handover/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean, societyId: defaultSocietyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order not found");

      setOrder(data.order);
      // Preselect all items with deliverable quantities
      const counts: Record<string, number> = {};
      data.order.items.forEach((it: HandoverItem) => {
        const net = Math.max(0, it.quantity - it.shortSuppliedQty);
        counts[it.skuId] = net;
      });
      setSelectedItems(counts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error looking up order");
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleToggleItem = (skuId: string, maxQty: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [skuId]: prev[skuId] > 0 ? 0 : maxQty,
    }));
  };

  const handleCompleteHandover = async (isPartial = false) => {
    if (!order) return;

    setSubmittingHandover(true);
    setError(null);
    setMessage(null);

    try {
      const collectedItems = Object.entries(selectedItems)
        .filter(([_, qty]) => qty > 0)
        .map(([skuId, quantity]) => ({ skuId, quantity }));

      const res = await fetch("/api/captain/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          isPartial,
          collectedItems,
          notes: handoverNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record handover");

      setMessage(
        isPartial
          ? "Partial collection recorded successfully."
          : `Order #${order.pickupCode} marked as fully HANDED OVER to resident!`
      );

      // Update local order status
      setOrder((prev) => (prev ? { ...prev, status: isPartial ? prev.status : "HANDED_OVER" } : null));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error completing handover");
    } finally {
      setSubmittingHandover(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search / Scan Box */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-1">
            Scan QR Code Token or Enter 6-Digit Pickup PIN
          </label>
          <form onSubmit={handleLookup} className="flex gap-2">
            <div className="relative flex-1">
              <QrCode className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="e.g. 849201 or QR Token"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-gray-300 pl-11 pr-4 py-2.5 font-mono text-sm uppercase tracking-wider text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={loadingLookup || !code.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {loadingLookup ? "Verifying..." : "Verify Order"}
            </button>
          </form>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Order Card */}
      {order && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold text-white">
                  {order.flat.tower ? `${order.flat.tower} - ` : ""}Flat {order.flat.flatNumber}
                </span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                    order.status === "HANDED_OVER"
                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                      : "bg-blue-100 text-blue-900 border-blue-300"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mt-2">
                {order.user.name || "Resident"}
              </h3>
              <p className="text-xs text-gray-500 font-mono">
                Phone: {order.user.phone} • PIN: {order.pickupCode}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Society Cycle</span>
              <span className="text-xs font-bold text-gray-800">{order.cycle.name}</span>
            </div>
          </div>

          {/* Items Checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Deliverable Items ({order.items.length} staples)
            </h4>

            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              {order.items.map((it) => {
                const netQty = Math.max(0, it.quantity - it.shortSuppliedQty);
                const isSelected = (selectedItems[it.skuId] || 0) > 0;

                return (
                  <div
                    key={it.id}
                    onClick={() => handleToggleItem(it.skuId, netQty)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent onClick
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900">
                          {it.sku.product.brand} - {it.sku.product.name}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {it.sku.variantName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-900">
                        {netQty} {it.sku.unit}
                      </span>
                      {it.shortSuppliedQty > 0 && (
                        <span className="block text-[10px] font-bold text-red-600">
                          Short: {it.shortSuppliedQty} (Refunded)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleCompleteHandover(true)}
              disabled={submittingHandover}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Record Partial Handover
            </button>

            <button
              type="button"
              onClick={() => handleCompleteHandover(false)}
              disabled={submittingHandover}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4" />
              {submittingHandover ? "Recording..." : "Complete Handover"}
            </button>
          </div>

          {/* Previous Handover History */}
          {order.handoverEvents.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <span className="text-[11px] font-bold uppercase text-gray-400 block">
                Collection Event Log
              </span>
              {order.handoverEvents.map((evt) => (
                <div key={evt.id} className="text-xs text-gray-600 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>
                    Collected on {new Date(evt.collectedAt).toLocaleString("en-IN")} (Handed over by{" "}
                    <strong>{evt.handedOverBy.name || "Captain"}</strong>)
                  </span>
                  {evt.isPartial && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      PARTIAL
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
