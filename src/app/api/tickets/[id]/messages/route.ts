import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { addTicketMessage } from "@/server/services/ticketService";
import { prisma } from "@/server/db/client";
import { Role } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    if (!isPlatformAdmin && ticket.userId !== user.userId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot message on this ticket." },
        { status: 403 }
      );
    }

    const newMessage = await addTicketMessage(user.userId, params.id, message);
    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/tickets/[id]/messages error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to post message" },
      { status: 400 }
    );
  }
}
