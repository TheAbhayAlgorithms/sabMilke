import { describe, it, expect } from "vitest";
import {
  selectCheapestSupplierQuote,
  SupplierCandidateQuote,
} from "@/server/domain/supplierSelection";

describe("Supplier Quote Selection at Lock (Section 3.2)", () => {
  const deliveryDate = new Date(Date.now() + 5 * 86400000); // 5 days from now
  const lockDate = new Date();

  const quotes: SupplierCandidateQuote[] = [
    {
      quoteId: "quote-apex",
      supplierId: "sup-1",
      supplierName: "Apex Agro Wholesale",
      supplierRating: 4.8,
      moq: 5,
      leadTimeDays: 2,
      validFrom: new Date(Date.now() - 5 * 86400000),
      validTo: new Date(Date.now() + 10 * 86400000),
      createdAt: new Date("2026-11-01T10:00:00Z"),
      slabs: [
        { minQty: 1, maxQty: 19, supplierPricePaise: 40000 },
        { minQty: 20, maxQty: 49, supplierPricePaise: 36000 },
        { minQty: 50, maxQty: null, supplierPricePaise: 32000 },
      ],
    },
    {
      quoteId: "quote-metro",
      supplierId: "sup-2",
      supplierName: "Metro Bulk Essentials",
      supplierRating: 4.6,
      moq: 10,
      leadTimeDays: 3,
      validFrom: new Date(Date.now() - 5 * 86400000),
      validTo: new Date(Date.now() + 10 * 86400000),
      createdAt: new Date("2026-11-01T11:00:00Z"),
      slabs: [
        { minQty: 1, maxQty: 19, supplierPricePaise: 39500 },
        { minQty: 20, maxQty: 49, supplierPricePaise: 36500 },
        { minQty: 50, maxQty: null, supplierPricePaise: 32500 },
      ],
    },
    {
      quoteId: "quote-bharat",
      supplierId: "sup-3",
      supplierName: "Bharat Staples Ltd",
      supplierRating: 4.4,
      moq: 5,
      leadTimeDays: 2,
      validFrom: new Date(Date.now() - 5 * 86400000),
      validTo: new Date(Date.now() + 10 * 86400000),
      createdAt: new Date("2026-11-01T12:00:00Z"),
      slabs: [
        { minQty: 1, maxQty: 19, supplierPricePaise: 41000 },
        { minQty: 20, maxQty: 49, supplierPricePaise: 37000 },
        { minQty: 50, maxQty: null, supplierPricePaise: 33000 },
      ],
    },
  ];

  it("selects quote with the lowest wholesale price at reached slab", () => {
    // At pooled volume 25 units:
    // Apex tier 2 = 36,000 paise (cheapest!)
    // Metro tier 2 = 36,500 paise
    // Bharat tier 2 = 37,000 paise
    const winner = selectCheapestSupplierQuote(quotes, 25, deliveryDate, lockDate);

    expect(winner.winningSupplierName).toBe("Apex Agro Wholesale");
    expect(winner.supplierPricePaise).toBe(36000);
    expect(winner.winningQuoteId).toBe("quote-apex");
    expect(winner.decisionReason).toContain("wholesale price of ₹360");
  });

  it("filters out quotes that do not satisfy MOQ", () => {
    // At pooled volume 8 units:
    // Metro MOQ is 10 (disqualified!)
    // Between Apex (40,000) and Bharat (41,000) -> Apex wins
    const winner = selectCheapestSupplierQuote(quotes, 8, deliveryDate, lockDate);

    expect(winner.winningSupplierName).toBe("Apex Agro Wholesale");
    expect(winner.supplierPricePaise).toBe(40000);
  });

  it("filters out quotes whose lead time exceeds target delivery date", () => {
    // Delivery is in 2 days. Metro lead time is 3 days -> disqualified!
    const tightDelivery = new Date(Date.now() + 2 * 86400000);
    const winner = selectCheapestSupplierQuote(quotes, 25, tightDelivery, lockDate);

    expect(winner.winningSupplierName).toBe("Apex Agro Wholesale");
  });

  it("filters out quotes outside the validity window", () => {
    const expiredQuotes: SupplierCandidateQuote[] = [
      {
        ...quotes[0],
        validTo: new Date(Date.now() - 1 * 86400000), // Expired yesterday!
      },
      quotes[1], // Valid
    ];

    const winner = selectCheapestSupplierQuote(expiredQuotes, 25, deliveryDate, lockDate);
    expect(winner.winningSupplierName).toBe("Metro Bulk Essentials");
  });

  it("breaks price ties using supplier rating (Tie-breaker 1)", () => {
    // Two quotes with identical price (36,000 paise).
    // Apex rating = 4.8, Metro rating = 4.6.
    // Apex must win the tie-break!
    const tiedQuotes: SupplierCandidateQuote[] = [
      {
        ...quotes[1],
        slabs: [{ minQty: 1, maxQty: null, supplierPricePaise: 36000 }],
        supplierRating: 4.6,
      },
      {
        ...quotes[0],
        slabs: [{ minQty: 1, maxQty: null, supplierPricePaise: 36000 }],
        supplierRating: 4.8,
      },
    ];

    const winner = selectCheapestSupplierQuote(tiedQuotes, 20, deliveryDate, lockDate);
    expect(winner.winningSupplierName).toBe("Apex Agro Wholesale");
    expect(winner.decisionReason).toContain("Tie broken by supplier rating");
  });

  it("breaks rating ties using earliest quote creation timestamp (Tie-breaker 2)", () => {
    // Identical price (36,000) AND identical rating (4.8).
    // Earlier creation time wins!
    const doubleTied: SupplierCandidateQuote[] = [
      {
        ...quotes[1],
        supplierRating: 4.8,
        createdAt: new Date("2026-11-01T14:00:00Z"), // later
        slabs: [{ minQty: 1, maxQty: null, supplierPricePaise: 36000 }],
      },
      {
        ...quotes[0],
        supplierRating: 4.8,
        createdAt: new Date("2026-11-01T10:00:00Z"), // earlier
        slabs: [{ minQty: 1, maxQty: null, supplierPricePaise: 36000 }],
      },
    ];

    const winner = selectCheapestSupplierQuote(doubleTied, 20, deliveryDate, lockDate);
    expect(winner.winningSupplierName).toBe("Apex Agro Wholesale");
  });

  it("throws clear error if no supplier quote satisfies MOQ or lead time", () => {
    const highMoqQuotes: SupplierCandidateQuote[] = [
      {
        ...quotes[0],
        moq: 100, // MOQ 100
      },
    ];

    expect(() =>
      selectCheapestSupplierQuote(highMoqQuotes, 10, deliveryDate, lockDate)
    ).toThrow(/No eligible supplier quote satisfies MOQ/);
  });
});
