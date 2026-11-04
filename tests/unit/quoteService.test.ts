import { describe, it, expect } from "vitest";
import { submitSupplierQuote, getQuotesComparisonForSku } from "@/server/services/quoteService";
import { prisma } from "@/server/db/client";

describe("Supplier Quote Submission & Quote Comparison Service", () => {
  it("submits a new quote with valid slabs and records audit log", async () => {
    const supplier = await prisma.supplier.findFirst();
    const sku = await prisma.sku.findFirst({
      where: { mrpPaise: { gt: 10000 } },
    });
    const user = await prisma.user.findFirst();

    expect(supplier).not.toBeNull();
    expect(sku).not.toBeNull();

    const quote = await submitSupplierQuote(user!.id, supplier!.id, {
      skuId: sku!.id,
      moq: 10,
      leadTimeDays: 3,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 15 * 86400000),
      slabs: [
        { minQty: 1, maxQty: 19, supplierPricePaise: Math.round(sku!.mrpPaise * 0.75) },
        { minQty: 20, maxQty: 49, supplierPricePaise: Math.round(sku!.mrpPaise * 0.7) },
        { minQty: 50, maxQty: null, supplierPricePaise: Math.round(sku!.mrpPaise * 0.65) },
      ],
    });

    expect(quote.id).toBeDefined();
    expect(quote.isActive).toBe(true);
    expect(quote.slabs).toHaveLength(3);

    // Verify audit log exists
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityId: quote.id,
        action: "SUPPLIER_QUOTE_SUBMITTED",
      },
    });
    expect(audit).not.toBeNull();
  });

  it("compares quotes across suppliers for an SKU", async () => {
    const sku = await prisma.sku.findFirst({
      where: { quotes: { some: { isActive: true } } },
    });
    expect(sku).not.toBeNull();

    const comparison = await getQuotesComparisonForSku(sku!.id);
    expect(comparison.sku.id).toBe(sku!.id);
    expect(comparison.comparison.length).toBeGreaterThan(0);

    const firstQuote = comparison.comparison[0];
    expect(firstQuote.supplierName).toBeDefined();
    expect(firstQuote.supplierRating).toBeGreaterThanOrEqual(1);
    expect(firstQuote.slabs.length).toBeGreaterThan(0);

    // Check enriched slab consumer price & savings calculation
    const slab1 = firstQuote.slabs[0];
    expect(slab1.residentPricePaise).toBeGreaterThan(slab1.supplierPricePaise);
    expect(slab1.residentPricePaise).toBeLessThanOrEqual(sku!.mrpPaise);
    expect(slab1.savingsPaise).toBe(sku!.mrpPaise - slab1.residentPricePaise);
  });
});

