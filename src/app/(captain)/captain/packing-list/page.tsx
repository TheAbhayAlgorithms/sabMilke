import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";
import { Role } from "@prisma/client";
import { getPerFlatPackingList } from "@/server/services/distributionService";
import { PackingListClient } from "@/components/captain/PackingListClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PackingListPageProps {
  searchParams: { cycleId?: string };
}

export default async function CaptainPackingListPage({ searchParams }: PackingListPageProps) {
  const session = await getCurrentSession();
  requireRole(session, [Role.CAPTAIN, Role.PLATFORM_ADMIN]);

  const membership = session?.memberships.find(
    (m) => m.role === Role.CAPTAIN || m.role === Role.PLATFORM_ADMIN
  );
  const societyId = membership?.societyId;

  // Find cycle
  let cycleId = searchParams.cycleId;
  if (!cycleId) {
    const activeCycle = await prisma.cycle.findFirst({
      where: societyId ? { societyId } : {},
      orderBy: { createdAt: "desc" },
    });
    cycleId = activeCycle?.id;
  }

  if (!cycleId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center text-xs text-gray-500">
        No cycle found. Please select an active or locked cycle.
      </div>
    );
  }

  // Get cycle to determine societyId if admin
  const targetCycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    select: { id: true, societyId: true },
  });

  if (!targetCycle) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center text-xs text-gray-500">
        Cycle not found.
      </div>
    );
  }

  const packingData = await getPerFlatPackingList(targetCycle.id, targetCycle.societyId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Navigation (Hidden on print) */}
      <div className="mb-4 print:hidden">
        <Link
          href="/captain"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Captain Hub
        </Link>
      </div>

      <PackingListClient packingData={packingData} />
    </div>
  );
}
