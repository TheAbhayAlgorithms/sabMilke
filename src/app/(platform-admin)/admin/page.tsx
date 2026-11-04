import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";
import Link from "next/link";
import { ShieldCheck, ShoppingBag, Eye, TrendingUp, Users, ArrowRight } from "lucide-react";

export default async function AdminPage() {
  const session = await getCurrentSession();
  requirePlatformAdmin(session);

  const [societiesCount, skusCount, cyclesCount, suppliersCount] = await Promise.all([
    prisma.society.count(),
    prisma.sku.count(),
    prisma.cycle.count(),
    prisma.supplier.count(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Admin Header */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-900 to-indigo-950 p-6 text-white shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-200 bg-purple-800/60 px-2.5 py-0.5 rounded-full mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Platform Superuser Console
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">SocietyBuy Master Operations</h1>
            <p className="text-xs text-purple-100 mt-1">
              Logged in as {session?.name} • Full multi-tenant administrative scope
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-purple-800/50 pt-4 text-center">
          <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-700/30">
            <span className="block text-[11px] text-purple-200">Housing Societies</span>
            <span className="text-lg font-bold">{societiesCount}</span>
          </div>
          <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-700/30">
            <span className="block text-[11px] text-purple-200">Catalogue SKUs</span>
            <span className="text-lg font-bold">{skusCount}</span>
          </div>
          <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-700/30">
            <span className="block text-[11px] text-purple-200">Wholesale Suppliers</span>
            <span className="text-lg font-bold">{suppliersCount}</span>
          </div>
          <div className="bg-purple-900/40 p-2.5 rounded-xl border border-purple-700/30">
            <span className="block text-[11px] text-purple-200">Total Cycles</span>
            <span className="text-lg font-bold">{cyclesCount}</span>
          </div>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/catalogue"
          className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 mb-3 group-hover:scale-105 transition-transform">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-gray-900 mb-1">Catalogue Manager</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Create and manage staple categories, products, SKUs, FSSAI licenses, and execute bulk CSV imports with line-by-line validation.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-700">
            <span>Manage Products & CSV Import</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/admin/cycles"
          className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 mb-3 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-gray-900 mb-1">Cycle Manager</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Create, open, force-lock, and cancel cycles. Inspect live per-SKU pooled quantities, reached slabs, and automated price drop refunds.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-700">
            <span>Manage Cycles & Force-Lock</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
