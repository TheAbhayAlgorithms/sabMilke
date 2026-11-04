"use client";

import React from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Package,
} from "lucide-react";

interface TicketSummary {
  id: string;
  category: string;
  subject: string;
  status: string;
  createdAt: string;
  order: {
    id: string;
    pickupCode: string;
  };
  sla: {
    isAcknowledged: boolean;
    acknowledgementRemainingHours: number;
    isAcknowledgementBreached: boolean;
    isResolved: boolean;
  };
}

interface ResidentTicketsListClientProps {
  tickets: TicketSummary[];
}

export function ResidentTicketsListClient({ tickets }: ResidentTicketsListClientProps) {
  function getStatusPill(status: string, sla: TicketSummary["sla"]) {
    switch (status) {
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" /> Resolved
          </span>
        );
      case "ACKNOWLEDGED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
            <ShieldCheck className="h-3 w-3" /> In Review
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-700">
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
            <Clock className="h-3 w-3" /> {sla.acknowledgementRemainingHours}h SLA left
          </span>
        );
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Support & Issues</h1>
            <p className="text-xs text-gray-500">
              Track your reported order issues and refund resolutions
            </p>
          </div>
        </div>

        <Link
          href="/orders"
          className="rounded-xl bg-brand-50 hover:bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 transition-colors"
        >
          View Orders
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center bg-gray-50/50">
          <LifeBuoy className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-700">No issues reported</p>
          <p className="text-xs text-gray-500 mt-1">
            If you ever receive a damaged or missing item from a monthly delivery, you can raise an issue directly from your order page.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-brand-500 hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 uppercase">
                      {t.category.replace("_", " ")}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Ticket #{t.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-1">
                    {t.subject}
                  </h3>
                </div>
                <div>{getStatusPill(t.status, t.sla)}</div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5 text-gray-400" />
                  Order #{t.order.pickupCode}
                </span>
                <span className="inline-flex items-center gap-1 text-brand-700 font-bold">
                  View Details <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
