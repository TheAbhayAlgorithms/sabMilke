import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { resolveTicket } from "@/server/services/ticketService";
import { validateCsrf } from "@/server/security/csrf";
import { Role } from "@prisma/client";
import { z } from "zod";

const resolveSchema = z.object({
  resolutionNotes: z.string().min(3, "Resolution notes required").max(2000),
  refundAmountPaise: z.number().int().nonnegative().optional().default(0),
  refundReason: z.string().optional(),
  shortItems: z
    .array(
      z.object({
        skuId: z.string(),
        shortQty: z.number().int().positive(),
        unitPricePaise: z.number().int().positive(),
      })
    )
    .optional()
    .default([]),
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
    const parsed = resolveSchema.parse(body);

    const ticket = await resolveTicket({
      actorId: user.userId,
      ticketId: params.id,
      resolutionNotes: parsed.resolutionNotes,
      refundAmountPaise: parsed.refundAmountPaise,
      refundReason: parsed.refundReason,
      shortItems: parsed.shortItems,
    });

    return NextResponse.json({ ticket });
  } catch (err: any) {
    const message = err instanceof z.ZodError ? err.errors[0]?.message : err.message;
    return NextResponse.json(
      { error: message || "Failed to resolve ticket" },
      { status: 400 }
    );
  }
}
