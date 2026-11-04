import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { createOrder } from "@/server/services/orderService";
import { validateCsrf } from "@/server/security/csrf";
import { z } from "zod";

const createOrderSchema = z.object({
  societyId: z.string().optional(),
  cycleId: z.string().min(1, "Cycle ID is required"),
  flatId: z.string().optional(),
  items: z
    .array(
      z.object({
        skuId: z.string().min(1, "SKU ID is required"),
        quantity: z.number().int().positive("Item quantity must be a positive integer"),
      })
    )
    .min(1, "Order must contain at least 1 item"),
  useWalletPaise: z.number().int().nonnegative().optional().default(0),
  paymentMethod: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.reason }, { status: 403 });
    }

    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createOrderSchema.parse(body);

    const targetSocietyId = parsed.societyId || session.activeSocietyId;
    const targetFlatId = parsed.flatId || session.activeFlatId;

    if (!targetSocietyId || !targetFlatId) {
      return NextResponse.json(
        { error: "Society and Flat selection are required to place an order." },
        { status: 400 }
      );
    }

    const result = await createOrder(session.userId, {
      societyId: targetSocietyId,
      cycleId: parsed.cycleId,
      flatId: targetFlatId,
      items: parsed.items,
      useWalletPaise: parsed.useWalletPaise,
      paymentMethod: parsed.paymentMethod,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create order" },
      { status: 400 }
    );
  }
}
