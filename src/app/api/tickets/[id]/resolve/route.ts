import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { resolveTicket } from "@/server/services/ticketService";
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
        { error: "Forbidden: Only platform admins can resolve grievance tickets." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { resolutionNotes, refundAmountPaise, refundReason, shortItems } = body;

    if (!resolutionNotes || typeof resolutionNotes !== "string" || !resolutionNotes.trim()) {
      return NextResponse.json(
        { error: "resolutionNotes is required." },
        { status: 400 }
      );
    }

    const ticket = await resolveTicket({
      actorId: user.id,
      ticketId: params.id,
      resolutionNotes,
      refundAmountPaise: refundAmountPaise ? Math.round(refundAmountPaise) : 0,
      refundReason,
      shortItems,
    });

    return NextResponse.json({ ticket });
  } catch (err: any) {
    console.error("POST /api/tickets/[id]/resolve error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to resolve ticket" },
      { status: 400 }
    );
  }
}
