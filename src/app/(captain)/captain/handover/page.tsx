import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireRole } from "@/server/auth/guards";
import { Role } from "@prisma/client";
import { HandoverClient } from "@/components/captain/HandoverClient";
import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";

export default async function CaptainHandoverPage() {
  const session = await getCurrentSession();
  requireRole(session, [Role.CAPTAIN, Role.PLATFORM_ADMIN]);

  const membership = session?.memberships.find(
    (m) => m.role === Role.CAPTAIN || m.role === Role.PLATFORM_ADMIN
  );
  const societyId = membership?.societyId;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Navigation */}
      <div className="mb-4">
        <Link
          href="/captain"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Captain Hub
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-900 p-6 text-white shadow-sm mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-semibold text-emerald-200 mb-2">
          <QrCode className="h-3.5 w-3.5" />
          Resident Handover & Verification
        </div>
        <h1 className="text-xl sm:text-2xl font-bold">Resident Pickup & Handover</h1>
        <p className="text-xs text-emerald-200 mt-1">
          Scan the resident&apos;s pickup pass QR token or enter their 6-digit pickup PIN to verify order details and record physical handover.
        </p>
      </div>

      <HandoverClient defaultSocietyId={societyId} />
    </div>
  );
}
