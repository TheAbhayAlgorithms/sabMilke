import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { createTicket, listTickets } from "@/server/services/ticketService";
import { Role, TicketStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as TicketStatus | null;
    const orderId = searchParams.get("orderId") || undefined;

    // Residents can only see their own tickets (Rule 5)
    const userId = isPlatformAdmin ? (searchParams.get("userId") || undefined) : user.userId;

    const tickets = await listTickets({
      userId,
      status: status || undefined,
      orderId,
    });

    return NextResponse.json({ tickets });
  } catch (err: any) {
    console.error("GET /api/tickets error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch tickets" },
      { status: err.message?.includes("Forbidden") || err.message?.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const body = await req.json();
    const { orderId, category, subject, description, photoUrls } = body;

    if (!orderId || !category || !subject || !description) {
      return NextResponse.json(
        { error: "orderId, category, subject, and description are required." },
        { status: 400 }
      );
    }

    const ticket = await createTicket({
      userId: user.userId,
      orderId,
      category,
      subject,
      description,
      photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/tickets error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create ticket" },
      { status: 400 }
    );
  }
}
