import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { createProductAndSku } from "@/server/services/catalogueService";
import { z } from "zod";

const createProductSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2),
  brand: z.string().min(2),
  isFood: z.boolean(),
  fssaiNumber: z.string().nullable().optional(),
  hsnCode: z.string(),
  gstRate: z.number(),
  variantName: z.string(),
  packSize: z.number().positive(),
  unit: z.string(),
  mrpPaise: z.number().int().positive(),
  marginPercent: z.number().optional(),
  marginMinPaise: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    requirePlatformAdmin(session);

    const json = await req.json();
    const parsed = createProductSchema.parse(json);

    const result = await createProductAndSku(session!.userId, parsed);

    return NextResponse.json({
      success: true,
      product: result.product,
      sku: result.sku,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

