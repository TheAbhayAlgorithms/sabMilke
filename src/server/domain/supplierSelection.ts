import { RawQuoteSlab } from "./slabValidation";
import { findReachedSlab } from "./pricing";

export interface SupplierCandidateQuote {
  quoteId: string;
  supplierId: string;
  supplierName: string;
  supplierRating: number;
  moq: number;
  leadTimeDays: number;
  validFrom: Date;
  validTo: Date;
  createdAt: Date;
  slabs: RawQuoteSlab[];
}

export interface SupplierSelectionResult {
  winningQuoteId: string;
  winningSupplierId: string;
  winningSupplierName: string;
  reachedSlab: RawQuoteSlab;
  supplierPricePaise: number;
  decisionReason: string;
}

/**
 * PURE BUSINESS LOGIC: Selects the winning supplier quote for an SKU at cycle lock.
 *
 * Rules:
 * 1. Must satisfy MOQ <= pooledQuantity.
 * 2. Must satisfy leadTimeDays <= maxAllowedLeadTimeDays.
 * 3. Must be valid across lockDate and deliveryDate.
 * 4. Primary: Lowest supplier wholesale price at the reached slab.
 * 5. Tie-breaker 1: Highest supplier rating.
 * 6. Tie-breaker 2: Earliest quote creation timestamp.
 */
export function selectCheapestSupplierQuote(
  quotes: SupplierCandidateQuote[],
  pooledQuantity: number,
  deliveryTargetDate: Date,
  lockDate: Date = new Date()
): SupplierSelectionResult {
  if (!quotes || quotes.length === 0) {
    throw new Error("No supplier quotes provided for selection.");
  }

  // Calculate max allowed lead time in days
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const maxAllowedLeadTimeDays = Math.max(
    1,
    Math.floor((deliveryTargetDate.getTime() - lockDate.getTime()) / millisecondsPerDay)
  );

  // 1. Filter eligible candidates
  const eligible = quotes.filter((q) => {
    // Validity window
    const isValidWindow = q.validFrom <= lockDate && q.validTo >= deliveryTargetDate;
    // MOQ check
    const meetsMoq = pooledQuantity >= q.moq;
    // Lead time check
    const meetsLeadTime = q.leadTimeDays <= maxAllowedLeadTimeDays;

    return isValidWindow && meetsMoq && meetsLeadTime;
  });

  if (eligible.length === 0) {
    throw new Error(
      `No eligible supplier quote satisfies MOQ (pooled: ${pooledQuantity}) and lead time (${maxAllowedLeadTimeDays} days target) for delivery.`
    );
  }

  // 2. Evaluate reached slab and score each eligible candidate
  const evaluated = eligible.map((q) => {
    const { slab } = findReachedSlab(q.slabs, pooledQuantity);
    return {
      quote: q,
      reachedSlab: slab,
      pricePaise: slab.supplierPricePaise,
      rating: q.supplierRating,
      createdAt: q.createdAt.getTime(),
    };
  });

  // 3. Sort: Lowest price -> Highest rating -> Earliest timestamp
  evaluated.sort((a, b) => {
    if (a.pricePaise !== b.pricePaise) {
      return a.pricePaise - b.pricePaise; // Primary: lowest price
    }
    if (b.rating !== a.rating) {
      return b.rating - a.rating; // Secondary tie-breaker: highest rating
    }
    return a.createdAt - b.createdAt; // Tertiary tie-breaker: earliest creation
  });

  const winner = evaluated[0];

  const tieInfo =
    evaluated.length > 1 && evaluated[1].pricePaise === winner.pricePaise
      ? ` (Tie broken by supplier rating: ${winner.rating} vs ${evaluated[1].rating})`
      : "";

  const decisionReason = `Selected ${winner.quote.supplierName} with wholesale price of ₹${winner.pricePaise / 100} at reached volume ${pooledQuantity} units (Tier ${winner.reachedSlab.minQty}-${winner.reachedSlab.maxQty ?? "∞"})${tieInfo}.`;

  return {
    winningQuoteId: winner.quote.quoteId,
    winningSupplierId: winner.quote.supplierId,
    winningSupplierName: winner.quote.supplierName,
    reachedSlab: winner.reachedSlab,
    supplierPricePaise: winner.pricePaise,
    decisionReason,
  };
}
