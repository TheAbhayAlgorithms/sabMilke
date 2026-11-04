import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { confirmOrderPayment } from "@/server/services/orderService";
import { validateCsrf } from "@/server/security/csrf";
import { z } from "zod";

const confirmPaymentSchema = z.object({
  providerPaymentId: z.string().optional(),
  paymentMethod: z.string().optional(),
  upiVpa: z.string().optional(),
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = confirmPaymentSchema.parse(body);

    const result = await confirmOrderPayment(session.userId, {
      orderId: params.id,
      providerPaymentId: parsed.providerPaymentId || `pay_mock_${Date.now()}`,
      paymentMethod: parsed.paymentMethod || "UPI_INTENT",
      upiVpa: parsed.upiVpa,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment confirmation failed" },
      { status: 400 }
    );
  }
}
