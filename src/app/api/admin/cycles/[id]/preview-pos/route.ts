import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { previewPurchaseOrdersForCycle } from "@/server/services/purchaseOrderService";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    requirePlatformAdmin(session);

    const proposedPos = await previewPurchaseOrdersForCycle(params.id);
    return NextResponse.json({ proposedPos });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to preview purchase orders" },
      { status: 400 }
    );
  }
}
