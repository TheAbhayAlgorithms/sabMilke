import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { recordGoodsReceipt } from "@/server/services/goodsReceiptService";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const body = await req.json();
    const { purchaseOrderId, receivedItems, notes } = body;

    if (!purchaseOrderId || !Array.isArray(receivedItems)) {
      return NextResponse.json(
        { error: "purchaseOrderId and receivedItems array are required." },
        { status: 400 }
      );
    }

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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record goods receipt" },
      { status: 400 }
    );
  }
}
