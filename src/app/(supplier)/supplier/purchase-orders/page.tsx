import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireSupplier } from "@/server/auth/guards";
import { getPurchaseOrdersForSupplier } from "@/server/services/purchaseOrderService";
import { formatINR } from "@/lib/money";
import Link from "next/link";
import { Package, Truck, ArrowLeft, ArrowRight, FileCheck, Calendar, MapPin } from "lucide-react";

export default async function SupplierPurchaseOrdersPage() {
  const session = await getCurrentSession();
  const user = requireSupplier(session);
  const supplierId = user.supplierId || session?.supplierId;

  if (!supplierId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-gray-500">
        Supplier account not linked.
      </div>
    );
  }

  const purchaseOrders = await getPurchaseOrdersForSupplier(supplierId);

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
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Navigation */}
      <div className="mb-4">
        <Link
          href="/supplier"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Supplier Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-900 to-indigo-950 p-6 text-white shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-800/60 px-3 py-1 text-xs font-semibold text-blue-200 backdrop-blur-xs mb-2">
              <Package className="h-3.5 w-3.5" />
              Wholesale Purchase Orders
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Purchase Orders & Dispatches</h1>
            <p className="text-xs text-blue-200 mt-1">
              Review assigned purchase orders, confirm fulfillment, upload tax invoices, and mark dispatches.
            </p>
          </div>

          <div className="text-right bg-blue-900/60 p-3 rounded-xl border border-blue-700/40">
            <span className="block text-[11px] text-blue-300 font-medium">Total Orders</span>
            <span className="text-xl font-bold">{purchaseOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {purchaseOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-2xs">
          <Package className="mx-auto h-10 w-10 text-gray-400 mb-3" />
          <h3 className="font-bold text-gray-900">No Purchase Orders Yet</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
            When housing society monthly cycles lock and your wholesale quotes win the volume slabs, Purchase Orders will be dispatched directly to your portal here.
          </p>
          <Link
            href="/supplier/quotes"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            Review Active Quotes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {purchaseOrders.map((po) => {
            const totalUnits = po.items.reduce((sum, it) => sum + it.orderedQuantity, 0);
            return (
              <div
                key={po.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{po.poNumber}</span>
                    <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${getStatusBadge(po.status)}`}>
                      {po.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {po.cycle.society.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      Delivery Target: {new Date(po.cycle.deliveryTargetDate).toLocaleDateString("en-IN")}
                    </span>
                    <span>
                      {po.items.length} staples ({totalUnits} total units)
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase text-gray-400 font-bold block">Wholesale Value</span>
                    <span className="text-base font-bold text-gray-900">{formatINR(po.totalAmountPaise)}</span>
                  </div>

                  <Link
                    href={`/supplier/purchase-orders/${po.id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    Manage PO
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
