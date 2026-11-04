import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { generateAndSendPurchaseOrders } from "@/server/services/purchaseOrderService";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    requirePlatformAdmin(session);

    const result = await generateAndSendPurchaseOrders(session!.userId, params.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate purchase orders" },
      { status: 400 }
    );
  }
}

