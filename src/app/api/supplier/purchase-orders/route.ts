import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireSupplier } from "@/server/auth/guards";
import { getPurchaseOrdersForSupplier } from "@/server/services/purchaseOrderService";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireSupplier(session);
    const supplierId = user.supplierId || session?.supplierId;

    if (!supplierId) {
      return NextResponse.json({ error: "Supplier ID required" }, { status: 400 });
    }

    const pos = await getPurchaseOrdersForSupplier(supplierId);
    return NextResponse.json({ purchaseOrders: pos });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch purchase orders" },
      { status: 400 }
    );
  }
}
