import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireSupplier } from "@/server/auth/guards";
import { submitSupplierQuote } from "@/server/services/quoteService";
import { z } from "zod";

const submitQuoteSchema = z.object({
  skuId: z.string(),
  moq: z.number().int().positive(),
  leadTimeDays: z.number().int().positive(),
  validFrom: z.string().transform((v) => new Date(v)),
  validTo: z.string().transform((v) => new Date(v)),
  slabs: z.array(
    z.object({
      minQty: z.number().int().positive(),
      maxQty: z.number().int().positive().nullable(),
      supplierPricePaise: z.number().int().positive(),
    })
  ).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    requireSupplier(session);

    const supplierId = session!.supplierId;
    if (!supplierId) {
      return NextResponse.json({ error: "User is not linked to a supplier." }, { status: 403 });
    }

    const json = await req.json();
    const parsed = submitQuoteSchema.parse(json);

    const quote = await submitSupplierQuote(session!.userId, supplierId, {
      skuId: parsed.skuId,
      moq: parsed.moq,
      leadTimeDays: parsed.leadTimeDays,
      validFrom: parsed.validFrom,
      validTo: parsed.validTo,
      slabs: parsed.slabs,
    });

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit quote";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

