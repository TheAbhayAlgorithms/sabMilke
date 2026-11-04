import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { recordGoodsReceipt } from "@/server/services/goodsReceiptService";
import { validateCsrf } from "@/server/security/csrf";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { z } from "zod";

const goodsReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1, "purchaseOrderId is required"),
  receivedItems: z
    .array(
      z.object({
        skuId: z.string().min(1, "skuId is required"),
        receivedQty: z.number().int().nonnegative("receivedQty must be >= 0"),
        shortQty: z.number().int().nonnegative("shortQty must be >= 0").optional().default(0),
        discrepancyNote: z.string().optional(),
      })
    )
    .min(1, "receivedItems must contain at least 1 item"),
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
    const { purchaseOrderId, receivedItems, notes } = goodsReceiptSchema.parse(body);

    // Verify PO exists and check access
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { cycle: true },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase order not found." }, { status: 404 });
    }

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    const isSocietyCaptain = user.memberships.some(
      (m) =>
        m.societyId === po.cycle.societyId &&
        (m.role === Role.CAPTAIN || m.role === Role.PLATFORM_ADMIN)
    );

    if (!isPlatformAdmin && !isSocietyCaptain) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to record goods receipt for this society." },
        { status: 403 }
      );
    }

    const result = await recordGoodsReceipt({
      actorId: user.userId,
      purchaseOrderId,
      receivedItems,
      notes,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record goods receipt";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
