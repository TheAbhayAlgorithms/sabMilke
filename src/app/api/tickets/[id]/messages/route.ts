import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { addTicketMessage } from "@/server/services/ticketService";
import { validateCsrf } from "@/server/security/csrf";
import { prisma } from "@/server/db/client";
import { Role } from "@prisma/client";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.reason }, { status: 403 });
    }

    const session = await getCurrentSession();
    const user = requireAuth(session);

    const body = await req.json();
    const { message } = messageSchema.parse(body);

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
    const message = err instanceof z.ZodError ? err.errors[0]?.message : err.message;
    return NextResponse.json(
      { error: message || "Failed to post message" },
      { status: 400 }
    );
  }
}
