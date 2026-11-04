import { describe, it, expect } from "vitest";
import {
  computePlatformMargin,
  computeGuaranteedPrice,
  findReachedSlab,
  computeFinalPrice,
  computeRefundDelta,
  computeNextTierProgress,
} from "@/server/domain/pricing";

describe("Pricing Engine & Slabs (Section 3.2 & Rule 10)", () => {
  const config = {
    marginPercent: 5.0,
    marginMinPaise: 1000, // min Rs 10
    mrpPaise: 50000,      // Rs 500 MRP
  };

  const sampleSlabs = [
    { minQty: 1, maxQty: 19, supplierPricePaise: 40000 },
    { minQty: 20, maxQty: 49, supplierPricePaise: 36000 },
    { minQty: 50, maxQty: null, supplierPricePaise: 32000 },
  ];

  it("computes platform margin using percentage with minimum paise floor", () => {
    // 5% of 10,000 paise is 500 paise. Floor is 1000 paise -> returns 1000.
    expect(computePlatformMargin(10000, 5.0, 1000)).toBe(1000);

    // 5% of 40,000 paise is 2000 paise (> 1000 floor) -> returns 2000.
    expect(computePlatformMargin(40000, 5.0, 1000)).toBe(2000);
  });

  it("computes guaranteed price capped at MRP (Rule 10)", () => {
    // Base 40,000 + margin 2,000 = 42,000 paise (below 50,000 MRP)
    const normal = computeGuaranteedPrice(40000, config);
    expect(normal).toBe(42000);

    // If wholesale price is high (49,000) + margin (2,450) = 51,450 -> capped at 50,000 MRP
    const capped = computeGuaranteedPrice(49000, config);
    expect(capped).toBe(50000);
  });

  it("findReachedSlab accurately selects tier based on pooled volume", () => {
    // Tier 1: pooled 8 units (1-19 bracket)
    const tier1 = findReachedSlab(sampleSlabs, 8);
    expect(tier1.index).toBe(0);
    expect(tier1.slab.supplierPricePaise).toBe(40000);

    // Tier 2: pooled 25 units (20-49 bracket)
    const tier2 = findReachedSlab(sampleSlabs, 25);
    expect(tier2.index).toBe(1);
    expect(tier2.slab.supplierPricePaise).toBe(36000);

    // Tier 3: pooled 60 units (50+ bracket)
    const tier3 = findReachedSlab(sampleSlabs, 60);
    expect(tier3.index).toBe(2);
    expect(tier3.slab.supplierPricePaise).toBe(32000);
  });

  it("computeFinalPrice computes final price capped at guaranteed price and MRP", () => {
    const guaranteedPricePaise = 42000;

    // At Tier 2: supplier 36,000 + 5% margin (1,800) = 37,800 paise
    const finalPrice = computeFinalPrice(36000, config, guaranteedPricePaise);
    expect(finalPrice).toBe(37800);
    expect(finalPrice).toBeLessThanOrEqual(guaranteedPricePaise);
    expect(finalPrice).toBeLessThanOrEqual(config.mrpPaise);
  });

  it("computeFinalPrice throws if calculated price exceeds guaranteed price", () => {
    // If somehow a supplier price produces higher than guaranteed, must throw
    expect(() => computeFinalPrice(45000, config, 42000)).toThrow(
      /cannot exceed guaranteed price/
    );
  });

  it("computeRefundDelta returns exact positive difference", () => {
    const delta = computeRefundDelta(42000, 37800);
    expect(delta).toBe(4200); // Rs 42 savings per unit!
  });

  it("computeRefundDelta returns 0 when no higher tier was unlocked", () => {
    const delta = computeRefundDelta(42000, 42000);
    expect(delta).toBe(0);
  });

  it("computeRefundDelta throws if final price > guaranteed price", () => {
    expect(() => computeRefundDelta(42000, 43000)).toThrow(/Refund delta would be negative/);
  });

  it("computeNextTierProgress calculates units needed and next tier savings", () => {
    // Currently pooled 12 units (Tier 1). Next tier starts at 20 units.
    const progress = computeNextTierProgress(sampleSlabs, 12, config);

    expect(progress.currentTierIndex).toBe(0);
    expect(progress.unitsNeededForNextTier).toBe(8); // 20 - 12
    expect(progress.currentResidentPricePaise).toBe(42000);
    expect(progress.nextTierResidentPricePaise).toBe(37800); // 36,000 + 1,800
    expect(progress.nextTierSavingsPerUnitPaise).toBe(4200); // 42,000 - 37,800
  });

  it("computeNextTierProgress handles highest tier reached with null next tier", () => {
    // Pooled 65 units (already in Tier 3: 50+)
    const progress = computeNextTierProgress(sampleSlabs, 65, config);

    expect(progress.currentTierIndex).toBe(2);
    expect(progress.nextSlab).toBeNull();
    expect(progress.unitsNeededForNextTier).toBe(0);
    expect(progress.nextTierResidentPricePaise).toBeNull();
  });
});
