import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { recordOrderHandover } from "@/server/services/distributionService";
import { validateCsrf } from "@/server/security/csrf";
import { prisma } from "@/server/db/client";
import { Role } from "@prisma/client";
import { z } from "zod";

const handoverSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  isPartial: z.boolean().optional().default(false),
  collectedItems: z
    .array(
      z.object({
        skuId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.reason }, { status: 403 });
    }

    const session = await getCurrentSession();
    const user = requireAuth(session);

    const body = await req.json();
    const { orderId, isPartial, collectedItems, notes } = handoverSchema.parse(body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, societyId: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    const isSocietyCaptain = user.memberships.some(
      (m) =>
        m.societyId === order.societyId &&
        (m.role === Role.CAPTAIN || m.role === Role.PLATFORM_ADMIN)
    );

    if (!isPlatformAdmin && !isSocietyCaptain) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to handover orders in this society." },
        { status: 403 }
      );
    }

    const result = await recordOrderHandover({
      actorId: user.userId,
      orderId,
      isPartial: Boolean(isPartial),
      collectedItems,
      notes,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Handover failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
