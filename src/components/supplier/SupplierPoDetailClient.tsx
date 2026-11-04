"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Truck,
  FileCheck,
  MapPin,
  Clock,
  Check,
} from "lucide-react";
import Link from "next/link";

interface PoItem {
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

interface GoodsReceiptItem {
  id: string;
  skuId: string;
  expectedQty: number;
  receivedQty: number;
  shortQty: number;
  discrepancyNote: string | null;
}

interface GoodsReceipt {
  id: string;
  receivedAt: string | Date;
  notes: string | null;
  receiver: {
    name: string | null;
    phone: string;
  };
  items: GoodsReceiptItem[];
}

interface PoDetail {
  id: string;
  poNumber: string;
  status: string;
  totalAmountPaise: number;
  supplierInvoiceUrl: string | null;
  dispatchedAt: string | Date | null;
  deliveredAt: string | Date | null;
  cycle: {
    id: string;
    name: string;
    deliveryTargetDate: string | Date;
    society: {
      name: string;
      address: string;
      city: string;
      pincode: string;
      dropPoints: {
        name: string;
        description: string | null;
        instructions: string | null;
      }[];
    };
  };
  items: PoItem[];
  goodsReceipts: GoodsReceipt[];
}

export function SupplierPoDetailClient({ initialPo }: { initialPo: PoDetail }) {
  const [po, setPo] = useState<PoDetail>(initialPo);
  const [invoiceUrl, setInvoiceUrl] = useState(initialPo.supplierInvoiceUrl || "");
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [loadingDispatch, setLoadingDispatch] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const handleConfirmPo = async () => {
    setLoadingConfirm(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/supplier/purchase-orders/${po.id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm PO");
      setPo((prev) => ({ ...prev, status: "CONFIRMED" }));
      setMessage("Purchase order confirmed! You may now prepare fulfillment and upload your GST invoice.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error confirming PO");
    } finally {
      setLoadingConfirm(false);
    }
  };

  const handleUploadInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceUrl.trim()) return;

    setLoadingInvoice(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/supplier/purchase-orders/${po.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceUrl: invoiceUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save invoice reference");
      setPo((prev) => ({ ...prev, supplierInvoiceUrl: invoiceUrl.trim() }));
      setMessage("Wholesale tax invoice recorded successfully!");
      setShowInvoiceModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error uploading invoice");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleDispatchPo = async () => {
    setLoadingDispatch(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/supplier/purchase-orders/${po.id}/dispatch`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark dispatched");
      setPo((prev) => ({
        ...prev,
        status: "DISPATCHED",
        dispatchedAt: new Date().toISOString(),
      }));
      setMessage("Order marked as DISPATCHED! Society drop point volunteer captain has been alerted for delivery receipt.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error marking dispatched");
    } finally {
      setLoadingDispatch(false);
    }
  };

  const dropPoint = po.cycle.society.dropPoints[0];
  const totalUnits = po.items.reduce((sum, it) => sum + it.orderedQuantity, 0);

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
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

      {/* Action Toolbar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-gray-500">Current PO Status:</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                po.status === "ISSUED"
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : po.status === "CONFIRMED"
                  ? "bg-blue-100 text-blue-900 border-blue-300"
                  : po.status === "DISPATCHED"
                  ? "bg-purple-100 text-purple-900 border-purple-300"
                  : po.status === "DELIVERED"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : "bg-red-100 text-red-900 border-red-300"
              }`}
            >
              {po.status}
            </span>
            {po.supplierInvoiceUrl && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <FileCheck className="h-3 w-3" /> Invoice Attached
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {po.status === "ISSUED" && (
            <button
              onClick={handleConfirmPo}
              disabled={loadingConfirm}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {loadingConfirm ? "Confirming..." : "Accept & Confirm PO"}
            </button>
          )}

          <button
            onClick={() => setShowInvoiceModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-3.5 w-3.5 text-indigo-600" />
            {po.supplierInvoiceUrl ? "Update Tax Invoice" : "Upload Tax Invoice"}
          </button>

          {po.status === "CONFIRMED" && (
            <button
              onClick={handleDispatchPo}
              disabled={loadingDispatch}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50"
            >
              <Truck className="h-4 w-4" />
              {loadingDispatch ? "Updating..." : "Mark Dispatched"}
            </button>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Upload Supplier Tax Invoice</h3>
            <p className="text-xs text-gray-500">
              Enter your GST tax invoice document link (PDF or cloud document URL) for PO #{po.poNumber}.
            </p>

            <form onSubmit={handleUploadInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Invoice PDF URL or Cloud Reference
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://storage.supplier.com/invoices/INV-2026-001.pdf"
                  value={invoiceUrl}
                  onChange={(e) => setInvoiceUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingInvoice}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loadingInvoice ? "Saving..." : "Save Invoice Reference"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Drop Point & Target */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            <MapPin className="h-4 w-4 text-red-500" />
            Society Drop Point & Delivery Address
          </div>
          <h4 className="font-bold text-sm text-gray-900">{po.cycle.society.name}</h4>
          <p className="text-xs text-gray-600 mt-0.5">
            {po.cycle.society.address}, {po.cycle.society.city} - {po.cycle.society.pincode}
          </p>

          {dropPoint && (
            <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs">
              <span className="font-bold text-gray-800 block">Specific Drop Point: {dropPoint.name}</span>
              {dropPoint.instructions && (
                <span className="text-gray-500 mt-0.5 block">{dropPoint.instructions}</span>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Timeline & Invoicing
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-gray-500">Scheduled Delivery Target</span>
              <span className="font-bold text-gray-900">
                {new Date(po.cycle.deliveryTargetDate).toLocaleDateString("en-IN", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-gray-500">Dispatch Status</span>
              <span className="font-semibold text-gray-900">
                {po.dispatchedAt
                  ? `Dispatched on ${new Date(po.dispatchedAt).toLocaleDateString("en-IN")}`
                  : "Not yet dispatched"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Supplier Invoice</span>
              <span className="font-semibold text-gray-900">
                {po.supplierInvoiceUrl ? (
                  <a
                    href={po.supplierInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Document
                  </a>
                ) : (
                  "Pending Upload"
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PO Itemized Lines */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">
            Ordered Staples & Slabs ({po.items.length} SKUs, {totalUnits} total units)
          </h3>
          <div className="text-right">
            <span className="text-[10px] uppercase text-gray-400 font-bold block">Total Wholesale Payable</span>
            <span className="text-base font-bold text-gray-900">{formatINR(po.totalAmountPaise)}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[11px] font-bold text-gray-700 uppercase border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Staple Product</th>
                <th className="px-4 py-3 text-center">Pooled Order Qty</th>
                <th className="px-4 py-3 text-right">Wholesale Unit Price</th>
                <th className="px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {po.items.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900">
                      {it.sku.product.brand} - {it.sku.product.name}
                    </div>
                    <div className="text-[11px] text-gray-400">{it.sku.variantName}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">
                    {it.orderedQuantity}
                  </td>
                  <td className="px-4 py-3 text-right">{formatINR(it.unitPricePaise)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {formatINR(it.totalPricePaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goods Receipt Summary if any */}
      {po.goodsReceipts.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Society Goods Receipt Confirmation
          </h3>
          {po.goodsReceipts.map((gr) => (
            <div key={gr.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Received By: <strong className="text-gray-900">{gr.receiver.name || "Captain"}</strong> ({gr.receiver.phone})</span>
                <span>Date: {new Date(gr.receivedAt).toLocaleDateString("en-IN")}</span>
              </div>
              {gr.notes && <p className="text-gray-500 italic">&ldquo;{gr.notes}&rdquo;</p>}

              <div className="mt-2 space-y-1">
                {gr.items.map((gri) => (
                  <div key={gri.id} className="flex justify-between items-center text-[11px] py-1 border-b border-gray-200/60">
                    <span className="text-gray-800">
                      Expected {gri.expectedQty} | Received: <strong className={gri.shortQty > 0 ? "text-red-600" : "text-emerald-700"}>{gri.receivedQty}</strong>
                    </span>
                    {gri.shortQty > 0 ? (
                      <span className="text-red-600 font-bold">Short by {gri.shortQty} ({gri.discrepancyNote})</span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">100% Fulfilled</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
