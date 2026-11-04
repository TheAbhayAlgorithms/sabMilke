import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { createOrder } from "@/server/services/orderService";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { societyId, cycleId, flatId, items, useWalletPaise, paymentMethod } = body;

    const targetSocietyId = societyId || session.activeSocietyId;
    const targetFlatId = flatId || session.activeFlatId;

    if (!targetSocietyId || !targetFlatId || !cycleId) {
      return NextResponse.json(
        { error: "Society, Flat, and Cycle identifiers are required to place an order." },
        { status: 400 }
      );
    }

    const result = await createOrder(session.userId, {
      societyId: targetSocietyId,
      cycleId,
      flatId: targetFlatId,
      items,
      useWalletPaise: useWalletPaise ? Number(useWalletPaise) : 0,
      paymentMethod,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create order" },
      { status: 400 }
    );
  }
}
