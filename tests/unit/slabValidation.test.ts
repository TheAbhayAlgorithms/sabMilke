import { describe, it, expect } from "vitest";
import { validateQuoteSlabs, SlabValidationError } from "@/server/domain/slabValidation";

describe("Quote Slab Domain Validation (Rule 10 & Volume Slabs)", () => {
  const sampleMrpPaise = 50000; // Rs 500

  it("accepts valid, contiguous, non-overlapping price slabs", () => {
    const validSlabs = [
      { minQty: 1, maxQty: 19, supplierPricePaise: 40000 },
      { minQty: 20, maxQty: 49, supplierPricePaise: 37500 },
      { minQty: 50, maxQty: null, supplierPricePaise: 35000 },
    ];

    const result = validateQuoteSlabs(validSlabs, sampleMrpPaise);
    expect(result).toHaveLength(3);
    expect(result[0].minQty).toBe(1);
    expect(result[1].minQty).toBe(20);
    expect(result[2].maxQty).toBeNull();
  });

  it("throws SlabValidationError if price exceeds MRP (Rule 10)", () => {
    const invalidSlabs = [
      { minQty: 1, maxQty: 19, supplierPricePaise: 55000 }, // > 50000 MRP
      { minQty: 20, maxQty: null, supplierPricePaise: 40000 },
    ];

    expect(() => validateQuoteSlabs(invalidSlabs, sampleMrpPaise)).toThrow(SlabValidationError);
    expect(() => validateQuoteSlabs(invalidSlabs, sampleMrpPaise)).toThrow(/cannot exceed MRP/);
  });

  it("throws SlabValidationError if slabs overlap", () => {
    const overlappingSlabs = [
      { minQty: 1, maxQty: 25, supplierPricePaise: 40000 },
      { minQty: 20, maxQty: null, supplierPricePaise: 35000 }, // Overlaps 20-25!
    ];

    expect(() => validateQuoteSlabs(overlappingSlabs, sampleMrpPaise)).toThrow(SlabValidationError);
    expect(() => validateQuoteSlabs(overlappingSlabs, sampleMrpPaise)).toThrow(/must be contiguous/);
  });

  it("throws SlabValidationError if slabs have gaps", () => {
    const gappedSlabs = [
      { minQty: 1, maxQty: 19, supplierPricePaise: 40000 },
      { minQty: 25, maxQty: null, supplierPricePaise: 35000 }, // Gap between 20 and 24!
    ];

    expect(() => validateQuoteSlabs(gappedSlabs, sampleMrpPaise)).toThrow(SlabValidationError);
    expect(() => validateQuoteSlabs(gappedSlabs, sampleMrpPaise)).toThrow(/Expected minQty 20, received 25/);
  });

  it("throws SlabValidationError if first slab does not start at 1", () => {
    const nonOneStart = [
      { minQty: 5, maxQty: null, supplierPricePaise: 40000 },
    ];

    expect(() => validateQuoteSlabs(nonOneStart, sampleMrpPaise)).toThrow(SlabValidationError);
    expect(() => validateQuoteSlabs(nonOneStart, sampleMrpPaise)).toThrow(/must start at 1/);
  });

  it("throws SlabValidationError if non-last slab has null maxQty", () => {
    const unboundedMiddle = [
      { minQty: 1, maxQty: null, supplierPricePaise: 40000 },
      { minQty: 20, maxQty: 50, supplierPricePaise: 35000 },
    ];

    expect(() => validateQuoteSlabs(unboundedMiddle, sampleMrpPaise)).toThrow(SlabValidationError);
  });

  it("throws SlabValidationError if price increases at higher volume tier", () => {
    const priceHikeAtVolume = [
      { minQty: 1, maxQty: 19, supplierPricePaise: 35000 },
      { minQty: 20, maxQty: null, supplierPricePaise: 42000 }, // More expensive at higher quantity!
    ];

    expect(() => validateQuoteSlabs(priceHikeAtVolume, sampleMrpPaise)).toThrow(SlabValidationError);
    expect(() => validateQuoteSlabs(priceHikeAtVolume, sampleMrpPaise)).toThrow(/cannot exceed previous tier price/);
  });

  it("throws if money is not integer paise (Rule 1 enforcement)", () => {
    const floatPrice = [
      { minQty: 1, maxQty: null, supplierPricePaise: 3500.5 },
    ];

    expect(() => validateQuoteSlabs(floatPrice, sampleMrpPaise)).toThrow(SlabValidationError);
  });
});
