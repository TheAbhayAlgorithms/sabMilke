import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { getPerFlatPackingList } from "@/server/services/distributionService";
import { prisma } from "@/server/db/client";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycleId");

    if (!cycleId) {
      return NextResponse.json({ error: "cycleId query parameter is required." }, { status: 400 });
    }

    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      select: { id: true, societyId: true },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found." }, { status: 404 });
    }

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    const isSocietyCaptain = user.memberships.some(
      (m) =>
        m.societyId === cycle.societyId &&
        (m.role === Role.CAPTAIN || m.role === Role.PLATFORM_ADMIN)
    );

    if (!isPlatformAdmin && !isSocietyCaptain) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to view the packing list for this society." },
        { status: 403 }
      );
    }

    const packingList = await getPerFlatPackingList(cycle.id, cycle.societyId);
    return NextResponse.json(packingList);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load packing list" },
      { status: 400 }
    );
  }
}

