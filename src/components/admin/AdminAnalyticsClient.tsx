"use client";

import React from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import {
  BarChart3,
  TrendingUp,
  Users,
  PiggyBank,
  Truck,
  RotateCcw,
  Building2,
  Star,
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { PlatformAnalyticsResult } from "@/server/domain/analytics";

interface AdminAnalyticsClientProps {
  analytics: PlatformAnalyticsResult;
}

export function AdminAnalyticsClient({ analytics }: AdminAnalyticsClientProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Platform Analytics & GMV Dashboard
            </h1>
            <p className="text-xs text-gray-500">
              Cross-society demand pooling, supplier fill rates, savings, and refund metrics
            </p>
          </div>
        </div>

        <Link
          href="/admin"
          className="self-start sm:self-auto rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          ← Admin Console
        </Link>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* GMV */}
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-bold uppercase">Pooled GMV</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-purple-950">
            {formatINR(analytics.gmvPaise)}
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 block">
            {analytics.totalOrders} total orders
          </span>
        </div>

        {/* Participation */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase">Participation</span>
            <Users className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-blue-950">
            {analytics.overallParticipationPercent}%
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 block">
            {analytics.totalParticipatingHouseholds} of {analytics.totalFlatsAcrossSocieties} flats
          </span>
        </div>

        {/* Resident Savings */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase">Resident Savings</span>
            <PiggyBank className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-emerald-950">
            {formatINR(analytics.totalResidentSavingsPaise)}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
            {analytics.effectiveSavingPercent}% effective saving
          </span>
        </div>

        {/* Supplier Fill Rate */}
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[11px] font-bold uppercase">Supplier Fill Rate</span>
            <Truck className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-indigo-950">
            {analytics.supplierFillRatePercent}%
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 block">
            Units delivered vs PO
          </span>
        </div>

        {/* Refunds Rate */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase">Refund Rate</span>
            <RotateCcw className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-amber-950">
            {analytics.refundRatePercent}%
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 block">
            {formatINR(analytics.totalRefundsPaise)} total
          </span>
        </div>

        {/* Societies */}
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-700 mb-1">
            <span className="text-[11px] font-bold uppercase">Societies</span>
            <Building2 className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-gray-900">
            {analytics.societies.length}
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 block">
            Active residential pools
          </span>
        </div>
      </div>

      {/* Contribution Per Society Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-700" />
            <h2 className="text-sm font-bold text-gray-900">
              Contribution & Performance per Society
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            {analytics.societies.length} societies tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
              <tr>
                <th className="px-4 py-3">Society Name</th>
                <th className="px-4 py-3">Join Code</th>
                <th className="px-4 py-3 text-right">Total Flats</th>
                <th className="px-4 py-3 text-right">Households Participating</th>
                <th className="px-4 py-3 text-right">Participation %</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Society GMV</th>
                <th className="px-4 py-3 text-right">Resident Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analytics.societies.map((s) => (
                <tr key={s.societyId} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {s.societyName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-brand-50 px-2 py-0.5 font-mono font-bold text-brand-700">
                      {s.joinCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{s.totalFlats}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {s.participatingFlats}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">
                    {s.participationPercent}%
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{s.orderCount}</td>
                  <td className="px-4 py-3 text-right font-black text-gray-900">
                    {formatINR(s.gmvPaise)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">
                    {formatINR(s.residentSavingsPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Performance Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-indigo-700" />
            <h2 className="text-sm font-bold text-gray-900">
              Supplier Fill Rate & Wholesale Fulfillment
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            {analytics.suppliers.length} active suppliers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
              <tr>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3 text-center">Rating</th>
                <th className="px-4 py-3 text-right">POs</th>
                <th className="px-4 py-3 text-right">Units Ordered</th>
                <th className="px-4 py-3 text-right">Units Delivered</th>
                <th className="px-4 py-3 text-right">Fill Rate %</th>
                <th className="px-4 py-3 text-right">Wholesale Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analytics.suppliers.map((sup) => (
                <tr key={sup.supplierId} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {sup.supplierName}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {sup.rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{sup.poCount}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{sup.orderedUnits}</td>
                  <td className="px-4 py-3 text-right text-gray-800 font-medium">
                    {sup.deliveredUnits}
                  </td>
                  <td className="px-4 py-3 text-right font-black">
                    <span
                      className={`rounded px-2 py-0.5 ${
                        sup.fillRatePercent >= 98
                          ? "bg-emerald-50 text-emerald-700"
                          : sup.fillRatePercent >= 90
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {sup.fillRatePercent}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-gray-900">
                    {formatINR(sup.totalWholesalePaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
