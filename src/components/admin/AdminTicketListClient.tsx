"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";

interface AdminTicketItem {
  id: string;
  category: string;
  subject: string;
  status: string;
  createdAt: string;
  user: {
    name: string | null;
    phone: string;
  };
  order: {
    id: string;
    pickupCode: string;
    society?: { name: string };
  };
  sla: {
    isAcknowledged: boolean;
    acknowledgementRemainingHours: number;
    isAcknowledgementBreached: boolean;
    resolutionRemainingDays: number;
    isResolutionBreached: boolean;
    isResolved: boolean;
  };
}

interface AdminTicketListClientProps {
  initialTickets: AdminTicketItem[];
}

export function AdminTicketListClient({ initialTickets }: AdminTicketListClientProps) {
  const [tickets] = useState<AdminTicketItem[]>(initialTickets);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.user.name?.toLowerCase().includes(q) ||
        t.user.phone.includes(q) ||
        t.order.pickupCode.includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const ackCount = tickets.filter((t) => t.status === "ACKNOWLEDGED").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;
  const breachCount = tickets.filter(
    (t) => t.sla.isAcknowledgementBreached || t.sla.isResolutionBreached
  ).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Grievance Officer Console
              </h1>
              <p className="text-xs text-gray-500">
                Statutory Grievance Redressal • 48-Hour SLA Acknowledgment & Resolution Desk
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/admin"
          className="self-start sm:self-auto rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          ← Admin Console
        </Link>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold">Pending 48h Ack</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-amber-900">{openCount}</div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-bold">In Investigation</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-blue-900">{ackCount}</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-bold">Resolved & Refunded</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-emerald-900">{resolvedCount}</div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/60 p-3.5">
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-xs font-bold">SLA Breaches</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-red-900">{breachCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by resident, subject, or order code..."
            className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
          {["ALL", "OPEN", "ACKNOWLEDGED", "RESOLVED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-3 py-2 whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? "bg-purple-700 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center bg-gray-50/50">
          <LifeBuoy className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-700">No tickets matching filter</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs divide-y divide-gray-100">
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              className="p-4 hover:bg-gray-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 uppercase">
                    {t.category.replace("_", " ")}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">
                    #{t.id.slice(-6).toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">• Order #{t.order.pickupCode}</span>
                  {t.order.society && (
                    <span className="text-xs text-gray-400">({t.order.society.name})</span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-gray-900 leading-snug">
                  {t.subject}
                </h3>

                <div className="text-xs text-gray-500">
                  Resident: <span className="font-medium text-gray-800">{t.user.name || t.user.phone}</span> ({t.user.phone})
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                {/* 48h SLA Status */}
                {t.status === "OPEN" && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      t.sla.isAcknowledgementBreached
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {t.sla.isAcknowledgementBreached
                      ? "Breached 48h SLA"
                      : `${t.sla.acknowledgementRemainingHours}h SLA remaining`}
                  </span>
                )}

                {t.status === "ACKNOWLEDGED" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                    <ShieldCheck className="h-3.5 w-3.5" /> Acknowledged ({t.sla.resolutionRemainingDays}d target)
                  </span>
                )}

                {t.status === "RESOLVED" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
                  </span>
                )}

                {t.status === "REJECTED" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                    Rejected
                  </span>
                )}

                <Link
                  href={`/admin/tickets/${t.id}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-purple-50 hover:bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700 transition-colors"
                >
                  Manage <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
