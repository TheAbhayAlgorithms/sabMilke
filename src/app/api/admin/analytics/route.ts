import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { getPlatformAnalytics } from "@/server/services/analyticsService";
import { Role } from "@prisma/client";

export async function GET(_req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    if (!isPlatformAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only platform administrators can view platform analytics." },
        { status: 403 }
      );
    }

    const analytics = await getPlatformAnalytics();
    return NextResponse.json({ analytics });
  } catch (err: any) {
    console.error("GET /api/admin/analytics error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch platform analytics" },
      { status: 500 }
    );
  }
}

