import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireSupplier } from "@/server/auth/guards";
import { dispatchPurchaseOrder, getPurchaseOrderDetail } from "@/server/services/purchaseOrderService";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    const user = requireSupplier(session);
    const supplierId = user.supplierId || session?.supplierId;

    if (!supplierId) {
      return NextResponse.json({ error: "Supplier ID required" }, { status: 400 });
    }

    await getPurchaseOrderDetail(params.id, supplierId);

    const updated = await dispatchPurchaseOrder(session!.userId, params.id);
    return NextResponse.json({ success: true, purchaseOrder: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to mark PO dispatched" },
      { status: 400 }
    );
  }
}
