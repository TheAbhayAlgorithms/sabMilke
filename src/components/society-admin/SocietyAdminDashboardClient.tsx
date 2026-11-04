"use client";

import React from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import {
  Building2,
  PiggyBank,
  Users,
  Coins,
  TrendingUp,
  Package,
  Calendar,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { SocietyAdminAnalyticsResult } from "@/server/domain/analytics";

interface SocietyAdminDashboardClientProps {
  analytics: SocietyAdminAnalyticsResult;
}

export function SocietyAdminDashboardClient({
  analytics,
}: SocietyAdminDashboardClientProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              RWA Society Dashboard: {analytics.societyName}
            </h1>
            <p className="text-xs text-gray-500">
              Resident welfare committee portal • Bulk buying participation & community development rebate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="rounded-xl bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs font-mono font-bold text-teal-800">
            Join Code: {analytics.joinCode}
          </span>
        </div>
      </div>

      {/* RWA Rebate Hero Banner */}
      <div className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-800 via-emerald-800 to-teal-950 p-6 text-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-xs">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-200 block">
                RWA Community Fund Accrual
              </span>
              <h2 className="text-sm font-bold text-white">2% Platform Development Rebate</h2>
            </div>
          </div>

          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-teal-100 backdrop-blur-xs">
            Credited to RWA Maintenance
          </span>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div>
            <span className="text-xs text-teal-200 block">Total Community Rebate Earned</span>
            <span className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {formatINR(analytics.societyRebatePaise)}
            </span>
          </div>

          <p className="text-xs text-teal-200 max-w-xs sm:text-right">
            Calculated as 2% of total pooled grocery GMV ({formatINR(analytics.gmvPaise)}) ordered by residents of {analytics.societyName}.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Pooled Society GMV</span>
            <TrendingUp className="h-4 w-4 text-brand-600" />
          </div>
          <div className="text-xl font-black text-gray-900">
            {formatINR(analytics.gmvPaise)}
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block">
            {analytics.totalOrders} total orders
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Flat Participation</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-900">
            {analytics.participationPercent}%
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 block">
            {analytics.participatingFlats} of {analytics.totalFlats} flats
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Resident Savings</span>
            <PiggyBank className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-900">
            {formatINR(analytics.totalResidentSavingsPaise)}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
            Vs retail quick-commerce
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Units Distributed</span>
            <Package className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-900">
            {analytics.totalUnitsDistributed}
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block">
            Staples collected at drop point
          </span>
        </div>
      </div>

      {/* Per-Cycle Breakdown Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-800" />
            <h2 className="text-sm font-bold text-gray-900">
              Monthly Purchasing Cycle Performance
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            {analytics.cycles.length} cycles recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
              <tr>
                <th className="px-4 py-3">Cycle Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Flats Joined</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Cycle GMV</th>
                <th className="px-4 py-3 text-right">Resident Savings</th>
                <th className="px-4 py-3 text-right">2% RWA Rebate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analytics.cycles.map((c) => {
                const cycleRebatePaise = Math.round((c.gmvPaise * 2) / 100);
                return (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {c.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          c.status === "OPEN"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {c.participatingFlats}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{c.ordersCount}</td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">
                      {formatINR(c.gmvPaise)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {formatINR(c.savingsPaise)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-teal-800">
                      {formatINR(cycleRebatePaise)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
