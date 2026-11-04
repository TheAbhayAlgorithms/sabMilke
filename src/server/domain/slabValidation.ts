export interface RawQuoteSlab {
  minQty: number;
  maxQty: number | null;
  supplierPricePaise: number;
}

export class SlabValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlabValidationError";
  }
}

/**
 * PURE BUSINESS LOGIC: Validates price slabs for supplier quotes.
 *
 * Enforces:
 * 1. Money is stored as integer paise (Rule 1).
 * 2. Supplier price must never exceed the SKU's MRP (Rule 10).
 * 3. Slabs must not overlap and must be contiguous.
 * 4. First slab must start at minQty >= 1.
 * 5. Only the final slab may have maxQty: null (unbounded upper tier).
 * 6. Higher volume tiers must offer equal or lower wholesale prices.
 */
export function validateQuoteSlabs(
  slabs: RawQuoteSlab[],
  mrpPaise: number
): RawQuoteSlab[] {
  if (!slabs || slabs.length === 0) {
    throw new SlabValidationError("Quote must contain at least one price slab.");
  }

  if (!Number.isInteger(mrpPaise) || mrpPaise <= 0) {
    throw new SlabValidationError(`Invalid MRP: ${mrpPaise}. Must be positive integer paise.`);
  }

  // Sort by minQty ascending to check continuity
  const sorted = [...slabs].sort((a, b) => a.minQty - b.minQty);

  let previousMaxQty = 0;
  let previousPricePaise = Infinity;

  for (let i = 0; i < sorted.length; i++) {
    const slab = sorted[i];
    const isLast = i === sorted.length - 1;

    // Integer checks
    if (!Number.isInteger(slab.minQty) || slab.minQty <= 0) {
      throw new SlabValidationError(
        `Slab ${i + 1}: minQty must be a positive integer, received: ${slab.minQty}`
      );
    }

    if (!Number.isInteger(slab.supplierPricePaise) || slab.supplierPricePaise <= 0) {
      throw new SlabValidationError(
        `Slab ${i + 1}: supplierPricePaise must be a positive integer in paise, received: ${slab.supplierPricePaise}`
      );
    }

    // Rule 10: Price never above MRP
    if (slab.supplierPricePaise > mrpPaise) {
      throw new SlabValidationError(
        `Slab ${i + 1}: Supplier price (₹${slab.supplierPricePaise / 100}) cannot exceed MRP (₹${mrpPaise / 100}).`
      );
    }

    // Continuity and non-overlapping check
    if (i === 0) {
      if (slab.minQty !== 1) {
        throw new SlabValidationError(
          `Slab 1: First slab minQty must start at 1, received: ${slab.minQty}`
        );
      }
    } else {
      if (slab.minQty !== previousMaxQty + 1) {
        throw new SlabValidationError(
          `Slab ${i + 1}: Slabs must be contiguous. Expected minQty ${previousMaxQty + 1}, received ${slab.minQty}. Slabs cannot overlap or have gaps.`
        );
      }
    }

    if (slab.maxQty !== null) {
      if (!Number.isInteger(slab.maxQty)) {
        throw new SlabValidationError(`Slab ${i + 1}: maxQty must be an integer or null.`);
      }
      if (slab.maxQty < slab.minQty) {
        throw new SlabValidationError(
          `Slab ${i + 1}: maxQty (${slab.maxQty}) must be greater than or equal to minQty (${slab.minQty}).`
        );
      }
      previousMaxQty = slab.maxQty;
    } else {
      if (!isLast) {
        throw new SlabValidationError(
          `Slab ${i + 1}: Only the last slab can have an unbounded maxQty (null).`
        );
      }
    }

    // Discount ladder logic: Wholesale price should not increase as volume increases
    if (slab.supplierPricePaise > previousPricePaise) {
      throw new SlabValidationError(
        `Slab ${i + 1}: Price at higher volume (₹${slab.supplierPricePaise / 100}) cannot exceed previous tier price (₹${previousPricePaise / 100}).`
      );
    }
    previousPricePaise = slab.supplierPricePaise;
  }

  return sorted;
}
