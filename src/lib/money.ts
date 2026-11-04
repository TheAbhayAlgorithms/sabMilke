/**
 * SocietyBuy Money Utilities
 *
 * RULE 1: All money is stored as integer paise. Never use floats for money.
 * Format with a single helper formatINR(paise).
 */

/**
 * Formats integer paise into Indian currency string format (e.g. ₹1,23,456 or ₹1,23,456.50)
 * Uses Indian numbering system with commas (lakhs, crores).
 */
export function formatINR(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new TypeError(`Money must be an integer number of paise, received: ${paise}`);
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  // Indian numbering formatter
  const formattedRupees = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(rupees);

  const sign = isNegative ? "-" : "";

  if (remainderPaise === 0) {
    return `${sign}₹${formattedRupees}`;
  }

  const paddedRemainder = remainderPaise.toString().padStart(2, "0");
  return `${sign}₹${formattedRupees}.${paddedRemainder}`;
}

/**
 * Converts integer rupees into integer paise.
 */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isInteger(rupees)) {
    throw new TypeError(`Rupees must be an integer, received: ${rupees}`);
  }
  return rupees * 100;
}

/**
 * Returns whole rupees by integer division.
 */
export function paiseToWholeRupees(paise: number): number {
  if (!Number.isInteger(paise)) {
    throw new TypeError(`Paise must be an integer, received: ${paise}`);
  }
  return Math.floor(paise / 100);
}

