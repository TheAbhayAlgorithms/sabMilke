import { describe, it, expect } from "vitest";
import { computeGstBreakup, generateTaxInvoiceData } from "@/server/domain/taxInvoice";

describe("Tax Invoicing & Statutory GST Breakup Domain", () => {
  it("computes intra-state GST tax breakup accurately from GST-inclusive paise", () => {
    // 5% GST on Rs 420 (42,000 paise gross)
    // Taxable = (42000 * 10000) / 10500 = 40,000 paise
    // Tax = 2,000 paise (CGST: 1,000, SGST: 1,000)
    const res5 = computeGstBreakup(42000, 5, false);

    expect(res5.taxableAmountPaise).toBe(40000);
    expect(res5.totalTaxPaise).toBe(2000);
    expect(res5.cgstPaise).toBe(1000);
    expect(res5.sgstPaise).toBe(1000);
    expect(res5.igstPaise).toBe(0);
    expect(res5.taxableAmountPaise + res5.totalTaxPaise).toBe(42000);
  });

  it("computes 18% GST with proper rounding in integer paise", () => {
    // 18% GST on Rs 1,180 (118,000 paise gross)
    // Taxable = (118000 * 10000) / 11800 = 100,000 paise
    // Tax = 18,000 paise (CGST: 9,000, SGST: 9,000)
    const res18 = computeGstBreakup(118000, 18, false);

    expect(res18.taxableAmountPaise).toBe(100000);
    expect(res18.totalTaxPaise).toBe(18000);
    expect(res18.cgstPaise).toBe(9000);
    expect(res18.sgstPaise).toBe(9000);
    expect(res18.igstPaise).toBe(0);
  });

  it("handles inter-state IGST computation", () => {
    // 12% GST inter-state on Rs 560 (56,000 paise)
    const res12 = computeGstBreakup(56000, 12, true);

    expect(res12.cgstPaise).toBe(0);
    expect(res12.sgstPaise).toBe(0);
    expect(res12.igstPaise).toBe(res12.totalTaxPaise);
    expect(res12.taxableAmountPaise + res12.igstPaise).toBe(56000);
  });

  it("handles 0% exempt commodities", () => {
    const res0 = computeGstBreakup(25000, 0, false);

    expect(res0.taxableAmountPaise).toBe(25000);
    expect(res0.totalTaxPaise).toBe(0);
    expect(res0.cgstPaise).toBe(0);
    expect(res0.sgstPaise).toBe(0);
    expect(res0.igstPaise).toBe(0);
  });

  it("generates complete resident invoice with statutory metadata marked TODO_LEGAL", () => {
    const items = [
      {
        skuId: "sku_1",
        productName: "Aashirvaad - Chakki Atta",
        variantName: "10kg Bag",
        hsnCode: "11010000",
        gstRatePercent: 5,
        quantity: 2,
        unitPricePaise: 38000,
      },
      {
        skuId: "sku_2",
        productName: "Surf Excel - Matic Front Load",
        variantName: "4kg Tub",
        hsnCode: "34022010",
        gstRatePercent: 18,
        quantity: 1,
        unitPricePaise: 48000,
      },
    ];

    const invoice = generateTaxInvoiceData("INV-2026-0001", items, false);

    expect(invoice.invoiceNumber).toBe("INV-2026-0001");
    expect(invoice.isCreditNote).toBe(false);
    expect(invoice.lines).toHaveLength(2);

    // Line 1: 2 * 38,000 = 76,000 gross
    expect(invoice.lines[0].grossAmountPaise).toBe(76000);
    expect(invoice.lines[0].hsnCode).toBe("11010000");

    // Line 2: 1 * 48,000 = 48,000 gross
    expect(invoice.lines[1].grossAmountPaise).toBe(48000);

    // Total gross = 124,000 paise (Rs 1,240.00)
    expect(invoice.totalAmountPaise).toBe(124000);
    expect(invoice.totalTaxablePaise + invoice.totalCgstPaise + invoice.totalSgstPaise).toBe(124000);

    // Rule 9 verification: legal entities must have TODO_LEGAL
    expect(invoice.legalEntity.companyName).toContain("TODO_LEGAL");
    expect(invoice.legalEntity.gstin).toContain("TODO_LEGAL");
    expect(invoice.legalEntity.grievanceOfficer).toContain("TODO_LEGAL");
  });

  it("generates credit note for short-supplied lines", () => {
    const items = [
      {
        skuId: "sku_1",
        productName: "Aashirvaad - Chakki Atta",
        variantName: "10kg Bag",
        hsnCode: "11010000",
        gstRatePercent: 5,
        quantity: 2,
        unitPricePaise: 38000,
        shortSuppliedQty: 1, // 1 unit short-supplied
      },
    ];

    const creditNote = generateTaxInvoiceData(
      "CN-2026-0001",
      items,
      false,
      true,
      "INV-2026-0001"
    );

    expect(creditNote.isCreditNote).toBe(true);
    expect(creditNote.originalInvoiceNumber).toBe("INV-2026-0001");
    expect(creditNote.lines).toHaveLength(1);
    expect(creditNote.lines[0].billedQuantity).toBe(1);
    expect(creditNote.lines[0].grossAmountPaise).toBe(38000);
    expect(creditNote.totalAmountPaise).toBe(38000);
  });
});

