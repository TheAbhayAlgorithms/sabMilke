import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { confirmOrderPayment } from "@/server/services/orderService";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { providerPaymentId, paymentMethod, upiVpa } = body;

    const result = await confirmOrderPayment(session.userId, {
      orderId: params.id,
      providerPaymentId: providerPaymentId || `pay_mock_${Date.now()}`,
      paymentMethod: paymentMethod || "UPI_INTENT",
      upiVpa,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment confirmation failed" },
      { status: 400 }
    );
  }
}
