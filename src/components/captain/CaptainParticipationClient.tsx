"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { Share2, Users, CheckCircle2, Clock, Copy, ExternalLink, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface FlatParticipationItem {
  flatId: string;
  flatNumber: string;
  tower: string | null;
  hasOrdered: boolean;
  residentName: string;
  residentPhone: string | null;
  orderTotalPaise: number;
  orderStatus: string | null;
}

interface CaptainParticipationData {
  society: {
    id: string;
    name: string;
    joinCode: string;
  };
  activeCycle: {
    id: string;
    name: string;
    locksAt: Date;
    minSocietyValuePaise: number;
    minHouseholds: number;
  } | null;
  stats: {
    totalFlats: number;
    orderedFlatsCount: number;
    participationPercent: number;
    totalPooledUnits: number;
    totalSocietyOrders: number;
    totalValuePaise: number;
  };
  flats: FlatParticipationItem[];
}

export function CaptainParticipationClient({ data }: { data: CaptainParticipationData }) {
  const [filter, setFilter] = useState<"ALL" | "ORDERED" | "PENDING">("ALL");
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join?code=${data.society.joinCode}`
    : `https://societybuy.in/join?code=${data.society.joinCode}`;

  const shareText = `Namaste neighbors! Join ${data.society.name} on SocietyBuy to pool our monthly grocery orders at wholesale slab prices. Use join code ${data.society.joinCode} or tap: ${inviteUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");
  };

  const filteredFlats = data.flats.filter((f) => {
    if (filter === "ORDERED") return f.hasOrdered;
    if (filter === "PENDING") return !f.hasOrdered;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-900 to-teal-950 p-6 text-white shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/60 px-3 py-1 text-xs font-bold text-emerald-200 mb-2">
              <Users className="h-3.5 w-3.5" />
              Volunteer Captain Participation Hub
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">{data.society.name}</h1>
            <p className="text-xs text-emerald-200 mt-1">
              {data.activeCycle ? `Active Pool: ${data.activeCycle.name}` : "No cycle currently open"}
            </p>
          </div>

          {/* Invite Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-xs hover:bg-white/20 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copied ? "Link Copied!" : "Copy Invite Link"}</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-600 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share to WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Aggregated Society Participation Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-emerald-800/60 pt-4 text-center">
          <div className="bg-emerald-900/40 p-2.5 rounded-2xl border border-emerald-700/40">
            <span className="block text-[11px] text-emerald-200">Participation Rate</span>
            <span className="text-lg font-bold">
              {data.stats.orderedFlatsCount} / {data.stats.totalFlats} ({data.stats.participationPercent}%)
            </span>
          </div>
          <div className="bg-emerald-900/40 p-2.5 rounded-2xl border border-emerald-700/40">
            <span className="block text-[11px] text-emerald-200">Total Pooled Units</span>
            <span className="text-lg font-bold">{data.stats.totalPooledUnits} units</span>
          </div>
          <div className="bg-emerald-900/40 p-2.5 rounded-2xl border border-emerald-700/40">
            <span className="block text-[11px] text-emerald-200">Total Pooled GMV</span>
            <span className="text-lg font-bold">{formatINR(data.stats.totalValuePaise)}</span>
          </div>
          <div className="bg-emerald-900/40 p-2.5 rounded-2xl border border-emerald-700/40">
            <span className="block text-[11px] text-emerald-200">Society Join Code</span>
            <span className="text-lg font-mono font-bold tracking-wider text-amber-300">{data.society.joinCode}</span>
          </div>
        </div>
      </div>

      {/* Participation List & Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Society Flats Roster & Orders</h2>
            <p className="text-xs text-gray-500">Track which neighbors have placed their monthly orders and nudge pending flats.</p>
          </div>

          <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filter === "ALL" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"}`}
            >
              All ({data.flats.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("ORDERED")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filter === "ORDERED" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-gray-600 hover:text-gray-900"}`}
            >
              Ordered ({data.stats.orderedFlatsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("PENDING")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filter === "PENDING" ? "bg-white text-amber-700 shadow-2xs font-bold" : "text-gray-600 hover:text-gray-900"}`}
            >
              Pending ({data.flats.length - data.stats.orderedFlatsCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-700 uppercase">
              <tr>
                <th className="px-4 py-3">Flat & Tower</th>
                <th className="px-4 py-3">Resident</th>
                <th className="px-4 py-3">Pool Status</th>
                <th className="px-4 py-3">Order Value</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredFlats.map((flat) => (
                <tr key={flat.flatId} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {flat.tower ? `${flat.tower} - ` : ""}Flat {flat.flatNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-gray-900 font-medium">{flat.residentName}</span>
                    {flat.residentPhone && (
                      <span className="text-[10px] text-gray-400">{flat.residentPhone}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {flat.hasOrdered ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Ordered ({flat.orderStatus})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        <Clock className="h-3 w-3" /> Not Ordered Yet
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {flat.hasOrdered ? formatINR(flat.orderTotalPaise) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!flat.hasOrdered && (
                      <button
                        type="button"
                        onClick={handleWhatsAppShare}
                        className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        Nudge on WhatsApp
                      </button>
                    )}
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
