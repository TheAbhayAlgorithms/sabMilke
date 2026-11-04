import { RawQuoteSlab } from "./slabValidation";

export interface PricingConfig {
  marginPercent: number;
  marginMinPaise: number;
  mrpPaise: number;
}

export interface NextTierProgress {
  currentTierIndex: number;
  currentSlab: RawQuoteSlab;
  currentSupplierPricePaise: number;
  currentResidentPricePaise: number;
  nextSlab: RawQuoteSlab | null;
  unitsNeededForNextTier: number;
  nextTierSupplierPricePaise: number | null;
  nextTierResidentPricePaise: number | null;
  nextTierSavingsPerUnitPaise: number;
}

/**
 * PURE BUSINESS LOGIC: Pricing Engine for SocietyBuy
 *
 * Enforces:
 * 1. Integer paise arithmetic exclusively (Rule 1).
 * 2. Selling prices never exceed MRP (Rule 10).
 * 3. Final price <= Guaranteed price; refund delta >= 0.
 */

/**
 * Computes the platform margin in paise with a minimum floor.
 */
export function computePlatformMargin(
  supplierPricePaise: number,
  marginPercent: number,
  minMarginPaise: number
): number {
  if (!Number.isInteger(supplierPricePaise) || supplierPricePaise < 0) {
    throw new TypeError(`supplierPricePaise must be non-negative integer paise: ${supplierPricePaise}`);
  }
  if (!Number.isInteger(minMarginPaise) || minMarginPaise < 0) {
    throw new TypeError(`minMarginPaise must be non-negative integer paise: ${minMarginPaise}`);
  }

  const percentageMargin = Math.round((supplierPricePaise * marginPercent) / 100);
  return Math.max(percentageMargin, minMarginPaise);
}

/**
 * Computes the guaranteed resident price at cycle open / join.
 * guaranteedPrice = (supplier price at the lowest slab) + margin, capped at MRP.
 */
export function computeGuaranteedPrice(
  lowestSlabSupplierPricePaise: number,
  config: PricingConfig
): number {
  const margin = computePlatformMargin(
    lowestSlabSupplierPricePaise,
    config.marginPercent,
    config.marginMinPaise
  );
  const price = lowestSlabSupplierPricePaise + margin;
  return Math.min(price, config.mrpPaise); // Rule 10: Never exceed MRP
}

/**
 * Finds the quote slab reached by the pooled society quantity.
 */
export function findReachedSlab(
  slabs: RawQuoteSlab[],
  pooledQuantity: number
): { slab: RawQuoteSlab; index: number } {
  if (!slabs || slabs.length === 0) {
    throw new Error("Cannot find reached slab from empty quote slabs.");
  }

  const sorted = [...slabs].sort((a, b) => a.minQty - b.minQty);
  let reachedIndex = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (pooledQuantity >= sorted[i].minQty) {
      reachedIndex = i;
    }
  }

  return {
    slab: sorted[reachedIndex],
    index: reachedIndex,
  };
}

/**
 * Computes final resident price at cycle lock based on the reached slab.
 * finalPrice = (supplier price at reached slab) + margin, capped at MRP.
 */
export function computeFinalPrice(
  reachedSlabSupplierPricePaise: number,
  config: PricingConfig,
  guaranteedPricePaise: number
): number {
  const margin = computePlatformMargin(
    reachedSlabSupplierPricePaise,
    config.marginPercent,
    config.marginMinPaise
  );
  const calculatedPrice = Math.min(reachedSlabSupplierPricePaise + margin, config.mrpPaise);

  // Final price must never exceed guaranteed price paid at join
  if (calculatedPrice > guaranteedPricePaise) {
    throw new Error(
      `Final price (₹${calculatedPrice / 100}) cannot exceed guaranteed price (₹${guaranteedPricePaise / 100}).`
    );
  }

  return calculatedPrice;
}

/**
 * Computes the refund delta per unit owed back to residents at lock.
 * refundDelta = guaranteedPrice - finalPrice per unit.
 */
export function computeRefundDelta(
  guaranteedPricePaise: number,
  finalPricePaise: number
): number {
  if (finalPricePaise > guaranteedPricePaise) {
    throw new Error(
      `Final price (₹${finalPricePaise / 100}) exceeds guaranteed price (₹${guaranteedPricePaise / 100}). Refund delta would be negative.`
    );
  }
  return guaranteedPricePaise - finalPricePaise;
}

/**
 * Computes next tier ladder progress for UI display ("Order X more units to reach ₹Y").
 */
export function computeNextTierProgress(
  slabs: RawQuoteSlab[],
  pooledQuantity: number,
  config: PricingConfig
): NextTierProgress {
  const sorted = [...slabs].sort((a, b) => a.minQty - b.minQty);
  const { slab: currentSlab, index: currentIndex } = findReachedSlab(sorted, pooledQuantity);

  const currentMargin = computePlatformMargin(
    currentSlab.supplierPricePaise,
    config.marginPercent,
    config.marginMinPaise
  );
  const currentResidentPricePaise = Math.min(
    currentSlab.supplierPricePaise + currentMargin,
    config.mrpPaise
  );

  const nextSlab = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

  let unitsNeededForNextTier = 0;
  let nextTierSupplierPricePaise: number | null = null;
  let nextTierResidentPricePaise: number | null = null;
  let nextTierSavingsPerUnitPaise = 0;

  if (nextSlab) {
    unitsNeededForNextTier = Math.max(0, nextSlab.minQty - pooledQuantity);
    nextTierSupplierPricePaise = nextSlab.supplierPricePaise;
    const nextMargin = computePlatformMargin(
      nextSlab.supplierPricePaise,
      config.marginPercent,
      config.marginMinPaise
    );
    nextTierResidentPricePaise = Math.min(
      nextSlab.supplierPricePaise + nextMargin,
      config.mrpPaise
    );
    nextTierSavingsPerUnitPaise = Math.max(
      0,
      currentResidentPricePaise - nextTierResidentPricePaise
    );
  }

  return {
    currentTierIndex: currentIndex,
    currentSlab,
    currentSupplierPricePaise: currentSlab.supplierPricePaise,
    currentResidentPricePaise,
    nextSlab,
    unitsNeededForNextTier,
    nextTierSupplierPricePaise,
    nextTierResidentPricePaise,
    nextTierSavingsPerUnitPaise,
  };
}
