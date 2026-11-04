import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { getSocietyAdminAnalytics } from "@/server/services/analyticsService";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const { searchParams } = new URL(req.url);
    let targetSocietyId = searchParams.get("societyId");

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    const societyAdminMembership = user.memberships.find(
      (m) => m.role === Role.SOCIETY_ADMIN
    );

    if (!isPlatformAdmin && !societyAdminMembership) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized as a society administrator." },
        { status: 403 }
      );
    }

    // If society admin, force societyId to their authorized society
    if (!isPlatformAdmin) {
      if (targetSocietyId && targetSocietyId !== societyAdminMembership!.societyId) {
        return NextResponse.json(
          { error: "Forbidden: Cross-society access is strictly prohibited." },
          { status: 403 }
        );
      }
      targetSocietyId = societyAdminMembership!.societyId;
    }

    if (!targetSocietyId) {
      // If platform admin and no societyId specified, default to first society
      const firstMembership = user.memberships[0];
      targetSocietyId = firstMembership?.societyId || null;
    }

    if (!targetSocietyId) {
      return NextResponse.json(
        { error: "societyId is required." },
        { status: 400 }
      );
    }

    const analytics = await getSocietyAdminAnalytics(targetSocietyId);
    return NextResponse.json({ analytics });
  } catch (err: any) {
    console.error("GET /api/society-admin/analytics error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch society analytics" },
      { status: 500 }
    );
  }
}

