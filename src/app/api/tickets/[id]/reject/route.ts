import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { rejectTicket } from "@/server/services/ticketService";
import { Role } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    if (!isPlatformAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only platform admins can reject grievance tickets." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { reason } = body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "Rejection reason is required." },
        { status: 400 }
      );
    }

    const ticket = await rejectTicket(user.id, params.id, reason);
    return NextResponse.json({ ticket });
  } catch (err: any) {
    console.error("POST /api/tickets/[id]/reject error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reject ticket" },
      { status: 400 }
    );
  }
}
