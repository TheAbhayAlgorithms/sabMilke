import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireRole } from "@/server/auth/guards";
import { Role } from "@prisma/client";
import Link from "next/link";
import {
  Users,
  PackageCheck,
  FileText,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Building,
} from "lucide-react";

export default async function CaptainPage() {
  const session = await getCurrentSession();
  requireRole(session, [Role.CAPTAIN, Role.PLATFORM_ADMIN]);

  const societyName = session?.memberships[0]?.societyName || "Housing Society";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-900 to-teal-950 p-6 text-white shadow-sm mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-semibold text-emerald-200 mb-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Volunteer Society Captain
        </div>
        <h1 className="text-xl sm:text-2xl font-bold">Volunteer Captain Hub</h1>
        <p className="mt-1 text-xs sm:text-sm text-emerald-200">
          Welcome, {session?.name}! You are managing society buying operations and drop point distributions for{" "}
          <strong>{societyName}</strong>.
        </p>
      </div>

      {/* Navigation Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Participation Roster */}
        <Link
          href="/captain/participation"
          className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 mb-3 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-gray-900 mb-1">Participation & Invites</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Track which flats have joined the current cycle, share WhatsApp invites, and approve new resident registrations.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>View Society Roster</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* Goods Receipt */}
        <Link
          href="/captain/goods-receipt"
          className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 mb-3 group-hover:scale-105 transition-transform">
              <PackageCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-gray-900 mb-1">Goods Receipt & Inspection</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              When wholesale trucks arrive at the society drop point, inspect quantities. The system auto-refunds any shortages to resident wallets.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-blue-700">
            <span>Inspect & Record Receipt</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* Per-Flat Packing List */}
        <Link
          href="/captain/packing-list"
          className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 mb-3 group-hover:scale-105 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-gray-900 mb-1">Per-Flat Packing Sheet</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Printable sheet sorted by tower and flat with items checklist, pickup PINs, and net deliverable counts for volunteers sorting bags.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-amber-700">
            <span>View & Print Packing List</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* Handover & QR Scanner */}
        <Link
          href="/captain/handover"
          className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 mb-3 group-hover:scale-105 transition-transform">
              <QrCode className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-gray-900 mb-1">QR Pickup & Handover</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Verify resident collection via their 6-digit pickup PIN or QR token. Supports full handover and partial collection tracking.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-700">
            <span>Open Handover Scanner</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
