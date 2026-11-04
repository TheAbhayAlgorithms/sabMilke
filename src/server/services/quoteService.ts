import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";
import { validateQuoteSlabs, RawQuoteSlab } from "@/server/domain/slabValidation";

export interface SubmitQuoteInput {
  skuId: string;
  moq: number;
  leadTimeDays: number;
  validFrom: Date;
  validTo: Date;
  slabs: RawQuoteSlab[];
}

export async function submitSupplierQuote(
  actorId: string,
  supplierId: string,
  input: SubmitQuoteInput
) {
  // 1. Fetch SKU to get mrpPaise
  const sku = await prisma.sku.findUnique({
    where: { id: input.skuId },
    include: { product: true },
  });

  if (!sku) {
    throw new Error(`SKU with id '${input.skuId}' not found.`);
  }

  // 2. Validate slabs with domain rules (Rule 10: price <= MRP, no overlaps, integer paise)
  const validatedSlabs = validateQuoteSlabs(input.slabs, sku.mrpPaise);

  if (input.moq <= 0 || !Number.isInteger(input.moq)) {
    throw new Error("MOQ must be a positive integer.");
  }

  if (input.leadTimeDays < 1 || !Number.isInteger(input.leadTimeDays)) {
    throw new Error("Lead time must be at least 1 day.");
  }

  if (input.validTo <= input.validFrom) {
    throw new Error("Quote validity end date must be after start date.");
  }

  return prisma.$transaction(async (tx) => {
    // 3. Deactivate previous quotes from this supplier for this SKU
    await tx.supplierQuote.updateMany({
      where: {
        supplierId,
        skuId: input.skuId,
        isActive: true,
      },
      data: { isActive: false },
    });

    // 4. Create new SupplierQuote
    const quote = await tx.supplierQuote.create({
      data: {
        supplierId,
        skuId: input.skuId,
        moq: input.moq,
        leadTimeDays: input.leadTimeDays,
        validFrom: input.validFrom,
        validTo: input.validTo,
        isActive: true,
        slabs: {
          create: validatedSlabs.map((s) => ({
            minQty: s.minQty,
            maxQty: s.maxQty,
            supplierPricePaise: s.supplierPricePaise,
          })),
        },
      },
      include: {
        slabs: {
          orderBy: { minQty: "asc" },
        },
        supplier: true,
      },
    });

    // 5. Record Audit Log (Rule 2)
    await recordAuditLog(
      {
        actorId,
        action: "SUPPLIER_QUOTE_SUBMITTED",
        entity: "SupplierQuote",
        entityId: quote.id,
        after: {
          supplierId,
          skuId: input.skuId,
          skuName: `${sku.product.brand} ${sku.product.name}`,
          slabsCount: validatedSlabs.length,
          bestPricePaise: validatedSlabs[validatedSlabs.length - 1].supplierPricePaise,
        },
      },
      tx
    );

    return quote;
  });
}

export async function getQuotesComparisonForSku(skuId: string) {
  const sku = await prisma.sku.findUnique({
    where: { id: skuId },
    include: {
      product: {
        include: { category: true },
      },
      quotes: {
        where: { isActive: true },
        include: {
          supplier: true,
          slabs: {
            orderBy: { minQty: "asc" },
          },
        },
        orderBy: [
          { supplier: { rating: "desc" } },
          { createdAt: "asc" },
        ],
      },
    },
  });

  if (!sku) {
    throw new Error(`SKU with id '${skuId}' not found.`);
  }

  // Calculate platform margin and consumer price for each slab
  const comparison = sku.quotes.map((quote) => {
    const enrichedSlabs = quote.slabs.map((slab) => {
      const marginPaise = Math.max(
        Math.round((slab.supplierPricePaise * Number(sku.marginPercent)) / 100),
        sku.marginMinPaise
      );
      const residentPricePaise = Math.min(slab.supplierPricePaise + marginPaise, sku.mrpPaise);
      const savingsPaise = Math.max(0, sku.mrpPaise - residentPricePaise);
      const savingsPercent = Math.round((savingsPaise / sku.mrpPaise) * 100);

      return {
        ...slab,
        marginPaise,
        residentPricePaise,
        savingsPaise,
        savingsPercent,
      };
    });

    return {
      quoteId: quote.id,
      supplierId: quote.supplierId,
      supplierName: quote.supplier.name,
      supplierRating: Number(quote.supplier.rating),
      gstin: quote.supplier.gstin,
      moq: quote.moq,
      leadTimeDays: quote.leadTimeDays,
      validFrom: quote.validFrom,
      validTo: quote.validTo,
      slabs: enrichedSlabs,
    };
  });

  return {
    sku,
    comparison,
  };
}

