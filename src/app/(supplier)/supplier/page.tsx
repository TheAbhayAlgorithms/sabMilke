import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireSupplier } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";
import Link from "next/link";
import { Truck, Tag, Package, CheckCircle2, ArrowRight } from "lucide-react";

export default async function SupplierPage() {
  const session = await getCurrentSession();
  requireSupplier(session);

  const supplier = await prisma.supplier.findUnique({
    where: { id: session!.supplierId },
    include: {
      quotes: {
        where: { isActive: true },
      },
      purchaseOrders: true,
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Supplier Welcome Header */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-900 to-indigo-950 p-6 text-white shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-200 bg-blue-800/60 px-2.5 py-0.5 rounded-full mb-2">
              <Truck className="h-3.5 w-3.5" />
              Verified Wholesaler Partner
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">{supplier?.name}</h1>
            <p className="text-xs text-blue-100 mt-1">
              GSTIN: {supplier?.gstin} • Supplier Rating: ★ {Number(supplier?.rating).toFixed(1)}
            </p>
          </div>

          <Link
            href="/supplier/quotes"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-900 shadow-xs hover:bg-blue-50"
          >
            <Tag className="h-4 w-4 text-blue-700" />
            Manage Slabs & Quotes
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-blue-800/50 pt-4 text-center">
          <div className="bg-blue-900/40 p-2.5 rounded-xl border border-blue-700/30">
            <span className="block text-[11px] text-blue-200">Active Quotes</span>
            <span className="text-lg font-bold">{supplier?.quotes.length ?? 0} SKUs</span>
          </div>
          <div className="bg-blue-900/40 p-2.5 rounded-xl border border-blue-700/30">
            <span className="block text-[11px] text-blue-200">Purchase Orders</span>
            <span className="text-lg font-bold">{supplier?.purchaseOrders.length ?? 0}</span>
          </div>
          <div className="bg-blue-900/40 p-2.5 rounded-xl border border-blue-700/30 col-span-2 sm:col-span-1">
            <span className="block text-[11px] text-blue-200">Partner Status</span>
            <span className="text-lg font-bold text-emerald-400">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/supplier/quotes"
          className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 mb-3 group-hover:scale-105 transition-transform">
              <Tag className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-gray-900 mb-1">Quotes & Slabs Manager</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Submit and update your volume tiered wholesale prices across staples. Configure MOQ, validity, and lead time days.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-blue-700">
            <span>Manage 25 Catalogue SKUs</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/supplier/purchase-orders"
          className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 mb-3 group-hover:scale-105 transition-transform">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-gray-900 mb-1">Purchase Orders</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              When a housing society cycle locks, winning wholesale orders appear here for confirmation, dispatch marking, and GST invoice upload.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-indigo-700">
            <span>View {supplier?.purchaseOrders.length ?? 0} Purchase Orders</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
