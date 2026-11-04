import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { getHandoverOrderByPinOrQr } from "@/server/services/distributionService";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const body = await req.json();
    const { code, societyId } = body;

    if (!code) {
      return NextResponse.json({ error: "Code (pickup PIN or QR token) is required." }, { status: 400 });
    }

    // Determine society ID
    let targetSocietyId = societyId;
    if (!targetSocietyId) {
      // Find first membership as CAPTAIN or resident
      const captainMembership = user.memberships.find(
        (m) => m.role === Role.CAPTAIN || m.role === Role.PLATFORM_ADMIN
      );
      if (captainMembership) {
        targetSocietyId = captainMembership.societyId;
      }
    }

    if (!targetSocietyId) {
      return NextResponse.json(
        { error: "Society context could not be determined. Please specify societyId." },
        { status: 400 }
      );
    }

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    const isSocietyCaptain = user.memberships.some(
      (m) =>
        m.societyId === targetSocietyId &&
        (m.role === Role.CAPTAIN || m.role === Role.PLATFORM_ADMIN)
    );

    if (!isPlatformAdmin && !isSocietyCaptain) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to perform handovers for this society." },
        { status: 403 }
      );
    }

    const order = await getHandoverOrderByPinOrQr({
      code,
      societyId: targetSocietyId,
    });

    return NextResponse.json({ order });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to lookup order for handover" },
      { status: 404 }
    );
  }
}
