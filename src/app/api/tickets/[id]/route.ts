import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { getTicket } from "@/server/services/ticketService";
import { Role } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    const ticket = await getTicket(params.id, user.userId, isPlatformAdmin);

    return NextResponse.json({ ticket });
  } catch (err: any) {
    console.error("GET /api/tickets/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch ticket" },
      { status: err.message?.includes("permission") ? 403 : 404 }
    );
  }
}
