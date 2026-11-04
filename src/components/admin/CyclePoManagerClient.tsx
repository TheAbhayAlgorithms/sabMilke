"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { Truck, FileCheck, CheckCircle2, AlertTriangle, Send, Eye, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";

interface ProposedPoItem {
  skuId: string;
  productName: string;
  variantName: string;
  packSize: number;
  unit: string;
  orderedQuantity: number;
  unitPricePaise: number;
  totalPricePaise: number;
}

interface ProposedPo {
  supplierId: string;
  supplierName: string;
  supplierRating: number;
  leadTimeDays: number;
  expectedDeliveryDays: number;
  totalAmountPaise: number;
  totalUnits: number;
  items: ProposedPoItem[];
}

interface ExistingPoItem {
  id: string;
  orderedQuantity: number;
  unitPricePaise: number;
  totalPricePaise: number;
  sku: {
    product: {
      brand: string;
      name: string;
    };
    variantName: string;
  };
}

interface ExistingPo {
  id: string;
  poNumber: string;
  status: string;
  totalAmountPaise: number;
  supplierInvoiceUrl: string | null;
  supplier: {
    name: string;
    gstin: string;
  };
  items: ExistingPoItem[];
}

interface CyclePoManagerClientProps {
  cycleId: string;
  cycleStatus: string;
  existingPos: ExistingPo[];
}

export function CyclePoManagerClient({
  cycleId,
  cycleStatus,
  existingPos: initialExistingPos,
}: CyclePoManagerClientProps) {
  const [existingPos, setExistingPos] = useState<ExistingPo[]>(initialExistingPos);
  const [proposedPos, setProposedPos] = useState<ProposedPo[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sendingPos, setSendingPos] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/cycles/${cycleId}/preview-pos`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load PO preview");
      setProposedPos(data.proposedPos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGenerateAndSend = async () => {
    if (!confirm("Are you sure you want to generate and issue Purchase Orders to all selected wholesale suppliers? This will advance cycle status to PO_SENT.")) {
      return;
    }
    setSendingPos(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/cycles/${cycleId}/generate-pos`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate POs");
      setMessage(`Successfully generated ${data.purchaseOrders.length} Purchase Orders! Cycle moved to PO_SENT.`);
      setProposedPos(null);
      // Reload page to refresh cycle status and data
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generating POs");
    } finally {
      setSendingPos(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ISSUED":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-900 border-blue-300";
      case "DISPATCHED":
        return "bg-purple-100 text-purple-900 border-purple-300";
      case "DELIVERED":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "DISCREPANCY":
        return "bg-red-100 text-red-900 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full mb-1 border border-indigo-200">
            <Truck className="h-3.5 w-3.5" />
            Wholesale Procurement & Supplier POs
          </div>
          <h2 className="text-lg font-bold text-gray-900">Purchase Orders (PO) Management</h2>
          <p className="text-xs text-gray-500">
            Preview, issue, and track wholesale purchase orders dispatched to verified suppliers based on winning slab prices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cycleStatus === "LOCKED" && (
            <button
              onClick={fetchPreview}
              disabled={loadingPreview}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              {loadingPreview ? "Generating Preview..." : "Preview Purchase Orders"}
            </button>
          )}

          {existingPos.length > 0 && (
            <Link
              href={`/captain/packing-list?cycleId=${cycleId}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 text-emerald-600" />
              Per-Flat Packing Sheet
            </Link>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Preview Section */}
      {proposedPos && proposedPos.length > 0 && (
        <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-indigo-950">
                Proposed Purchase Orders ({proposedPos.length} Suppliers)
              </h3>
              <p className="text-xs text-indigo-800">
                Aggregate wholesale quantities and cost ready to be dispatched to suppliers.
              </p>
            </div>
            <button
              onClick={handleGenerateAndSend}
              disabled={sendingPos}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {sendingPos ? "Sending POs..." : "Issue & Send POs to Suppliers"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proposedPos.map((ppo) => (
              <div key={ppo.supplierId} className="rounded-xl border border-indigo-200 bg-white p-4 shadow-2xs">
                <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{ppo.supplierName}</h4>
                    <span className="text-[11px] text-gray-500">Rating: ★ {Number(ppo.supplierRating).toFixed(1)} • Lead time: {ppo.leadTimeDays}d</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-900 block">{formatINR(ppo.totalAmountPaise)}</span>
                    <span className="text-[10px] text-gray-500">{ppo.totalUnits} total units</span>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <table className="w-full text-left text-[11px] text-gray-600">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] uppercase text-gray-400 font-bold">
                        <th className="py-1">Staple Item</th>
                        <th className="py-1 text-center">Qty</th>
                        <th className="py-1 text-right">Wholesale Rate</th>
                        <th className="py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ppo.items.map((it) => (
                        <tr key={it.skuId}>
                          <td className="py-1.5 font-medium text-gray-800">
                            {it.productName} <span className="text-gray-400">({it.variantName})</span>
                          </td>
                          <td className="py-1.5 text-center font-bold">{it.orderedQuantity}</td>
                          <td className="py-1.5 text-right">{formatINR(it.unitPricePaise)}</td>
                          <td className="py-1.5 text-right font-bold text-gray-900">{formatINR(it.totalPricePaise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Purchase Orders List */}
      {existingPos.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Active Purchase Orders for this Cycle ({existingPos.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] font-bold text-gray-700 uppercase border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Wholesaler</th>
                  <th className="px-4 py-3">Lines & Items</th>
                  <th className="px-4 py-3">Wholesale Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {existingPos.map((po) => {
                  const totalUnits = po.items.reduce((s, it) => s + it.orderedQuantity, 0);
                  return (
                    <tr key={po.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {po.poNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{po.supplier.name}</div>
                        <div className="text-[10px] text-gray-400">{po.supplier.gstin}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{po.items.length} staples</span>
                        <span className="text-[11px] text-gray-500 block">({totalUnits} units total)</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {formatINR(po.totalAmountPaise)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${getStatusBadge(po.status)}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {po.supplierInvoiceUrl ? (
                          <a
                            href={po.supplierInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                          >
                            <FileCheck className="h-3.5 w-3.5" />
                            Uploaded
                          </a>
                        ) : (
                          <span className="text-[11px] text-gray-400">Pending Upload</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-500">
          {cycleStatus === "OPEN"
            ? "Cycle is currently OPEN. Once the countdown ends and the cycle is LOCKED, you can preview and issue Purchase Orders here."
            : cycleStatus === "LOCKED"
            ? "Cycle is LOCKED. Click 'Preview Purchase Orders' above to review wholesale volumes and dispatch orders to suppliers."
            : "No purchase orders generated for this cycle."}
        </div>
      )}
    </div>
  );
}
