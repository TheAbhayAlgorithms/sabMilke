import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { createTicket, listTickets } from "@/server/services/ticketService";
import { validateCsrf } from "@/server/security/csrf";
import { Role, TicketStatus } from "@prisma/client";
import { z } from "zod";

const createTicketSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  category: z.enum(["DAMAGED_PACK", "MISSING_ITEM", "QUALITY_ISSUE", "OTHER"]),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(150),
  description: z.string().min(5, "Description must be at least 5 characters").max(2000),
  photoUrls: z.array(z.string().url()).optional().default([]),
});

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
    return NextResponse.json(
      { error: err.message || "Failed to fetch tickets" },
      { status: err.message?.includes("Forbidden") || err.message?.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.reason }, { status: 403 });
    }

    const session = await getCurrentSession();
    const user = requireAuth(session);

    const body = await req.json();
    const parsed = createTicketSchema.parse(body);

    const ticket = await createTicket({
      userId: user.userId,
      orderId: parsed.orderId,
      category: parsed.category,
      subject: parsed.subject,
      description: parsed.description,
      photoUrls: parsed.photoUrls,
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err: any) {
    const message = err instanceof z.ZodError ? err.errors[0]?.message : err.message;
    return NextResponse.json(
      { error: message || "Failed to create ticket" },
      { status: 400 }
    );
  }
}
