import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { acknowledgeTicket } from "@/server/services/ticketService";
import { Role } from "@prisma/client";

export async function POST(
  _req: NextRequest,
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
        { error: "Forbidden: Only platform admins can acknowledge grievance tickets." },
        { status: 403 }
      );
    }

    const ticket = await acknowledgeTicket(user.userId, params.id);
    return NextResponse.json({ ticket });
  } catch (err: any) {
    console.error("POST /api/tickets/[id]/acknowledge error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to acknowledge ticket" },
      { status: 400 }
    );
  }
}
