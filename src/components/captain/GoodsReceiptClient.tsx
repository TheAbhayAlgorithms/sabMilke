"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import {
  Truck,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

interface PoItem {
  id: string;
  skuId: string;
  orderedQuantity: number;
  unitPricePaise: number;
  sku: {
    product: {
      brand: string;
      name: string;
    };
    variantName: string;
  };
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  supplierInvoiceUrl: string | null;
  totalAmountPaise: number;
  supplier: {
    name: string;
    gstin: string;
  };
  cycle: {
    id: string;
    name: string;
  };
  items: PoItem[];
}

export function GoodsReceiptClient({
  availablePos,
}: {
  availablePos: PurchaseOrder[];
}) {
  const [selectedPoId, setSelectedPoId] = useState<string>(
    availablePos[0]?.id || ""
  );
  const selectedPo = availablePos.find((p) => p.id === selectedPoId);

  // Quantities keyed by skuId
  const [receivedCounts, setReceivedCounts] = useState<Record<string, number>>(
    () => {
      const counts: Record<string, number> = {};
      selectedPo?.items.forEach((it) => {
        counts[it.skuId] = it.orderedQuantity;
      });
      return counts;
    }
  );

  const [discrepancyNotes, setDiscrepancyNotes] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPo = (poId: string) => {
    setSelectedPoId(poId);
    setResult(null);
    setError(null);
    const target = availablePos.find((p) => p.id === poId);
    if (target) {
      const counts: Record<string, number> = {};
      target.items.forEach((it) => {
        counts[it.skuId] = it.orderedQuantity;
      });
      setReceivedCounts(counts);
      setDiscrepancyNotes({});
    }
  };

  const handleQtyChange = (skuId: string, val: number) => {
    setReceivedCounts((prev) => ({
      ...prev,
      [skuId]: Math.max(0, val),
    }));
  };

  const handleNoteChange = (skuId: string, note: string) => {
    setDiscrepancyNotes((prev) => ({
      ...prev,
      [skuId]: note,
    }));
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const receivedItems = selectedPo.items.map((it) => ({
        skuId: it.skuId,
        receivedQty: receivedCounts[it.skuId] ?? it.orderedQuantity,
        discrepancyNote: discrepancyNotes[it.skuId] || undefined,
      }));

      const res = await fetch("/api/captain/goods-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: selectedPo.id,
          receivedItems,
          notes: generalNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record goods receipt");

      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error recording goods receipt");
    } finally {
      setSubmitting(false);
    }
  };

  if (availablePos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-2xs">
        <Truck className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        <h3 className="font-bold text-gray-900">No Pending Deliveries</h3>
        <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
          There are no purchase orders currently in DISPATCHED or CONFIRMED state for your society.
          Goods receipt will become available when suppliers dispatch the wholesale shipments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PO Selector */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3">
        <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider">
          Select Arriving Supplier Shipment
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {availablePos.map((po) => {
            const isSelected = po.id === selectedPoId;
            return (
              <button
                key={po.id}
                type="button"
                onClick={() => handleSelectPo(po.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900">{po.poNumber}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {po.status}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1 font-medium">{po.supplier.name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {po.items.length} items • {formatINR(po.totalAmountPaise)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {result && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-950 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-base">Goods Receipt Recorded Successfully!</h3>
          </div>
          <p className="text-xs text-emerald-800">
            The shipment has been verified. Status of Purchase Order #{selectedPo?.poNumber} updated to{" "}
            <strong>{result.purchaseOrder?.status}</strong>.
          </p>

          {result.hasShortage && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs space-y-2 mt-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <ShieldAlert className="h-4 w-4 text-amber-700" />
                Shortage Discrepancies Handled:
              </div>
              <p className="text-amber-800">
                Short-supplied lines were detected. The system automatically
                credited their digital wallets with short-supply refunds and generated credit notes.
              </p>
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <Link
              href={`/captain/packing-list?cycleId=${selectedPo?.cycle.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <FileCheck className="h-4 w-4" />
              View Updated Per-Flat Packing Sheet
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Item Inspection & Receipt Form */}
      {selectedPo && !result && (
        <form onSubmit={handleSubmitReceipt} className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Verify Physical Deliveries for PO #{selectedPo.poNumber}
              </h3>
              <p className="text-xs text-gray-500">
                Count items unloaded at society drop point. If any boxes are damaged or missing, reduce the received count.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-[11px] font-bold text-gray-700 uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Staple Product</th>
                    <th className="px-4 py-3 text-center">Expected Units</th>
                    <th className="px-4 py-3 text-center">Received Units</th>
                    <th className="px-4 py-3">Discrepancy Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {selectedPo.items.map((it) => {
                    const received = receivedCounts[it.skuId] ?? it.orderedQuantity;
                    const isShort = received < it.orderedQuantity;

                    return (
                      <tr key={it.id} className={isShort ? "bg-amber-50/40" : ""}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">
                            {it.sku.product.brand} - {it.sku.product.name}
                          </div>
                          <div className="text-[11px] text-gray-400">{it.sku.variantName}</div>
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-gray-900">
                          {it.orderedQuantity}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={it.orderedQuantity}
                              value={received}
                              onChange={(e) =>
                                handleQtyChange(it.skuId, parseInt(e.target.value) || 0)
                              }
                              className={`w-20 rounded-lg border px-2 py-1 text-center font-bold text-xs focus:ring-1 ${
                                isShort
                                  ? "border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-500 focus:ring-amber-500"
                                  : "border-gray-300 text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
                              }`}
                            />
                            {isShort && (
                              <span className="text-[11px] font-bold text-amber-700 whitespace-nowrap">
                                (-{it.orderedQuantity - received})
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="text"
                            placeholder={isShort ? "e.g. 1 carton damaged in transit" : "Optional note"}
                            value={discrepancyNotes[it.skuId] || ""}
                            onChange={(e) => handleNoteChange(it.skuId, e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                General Drop Point Delivery Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Received at Tower A Clubhouse drop point. Boxes intact."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                <PackageCheck className="h-4 w-4" />
                {submitting ? "Confirming Receipt..." : "Confirm Goods Receipt"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
