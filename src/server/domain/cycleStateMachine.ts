import { CycleStatus } from "@prisma/client";
import { formatINR } from "@/lib/money";

export class InvalidCycleTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCycleTransitionError";
  }
}

export interface CycleMinimumsCheck {
  totalValuePaise: number;
  uniqueHouseholds: number;
  minSocietyValuePaise: number;
  minHouseholds: number;
}

export interface FoodSkuCheck {
  isFood: boolean;
  fssaiNumber: string | null;
  skuName: string;
}

/**
 * Valid transitions map for SocietyBuy cycle state machine.
 */
const VALID_TRANSITIONS: Record<CycleStatus, CycleStatus[]> = {
  DRAFT: [CycleStatus.OPEN, CycleStatus.CANCELLED, CycleStatus.DISPUTED],
  OPEN: [CycleStatus.LOCKED, CycleStatus.CANCELLED, CycleStatus.DISPUTED],
  LOCKED: [CycleStatus.PO_SENT, CycleStatus.CANCELLED, CycleStatus.DISPUTED],
  PO_SENT: [CycleStatus.RECEIVED, CycleStatus.PARTIAL, CycleStatus.DISPUTED],
  PARTIAL: [CycleStatus.RECEIVED, CycleStatus.DISPUTED],
  RECEIVED: [CycleStatus.DISTRIBUTING, CycleStatus.DISPUTED],
  DISTRIBUTING: [CycleStatus.CLOSED, CycleStatus.DISPUTED],
  CLOSED: [CycleStatus.DISPUTED],
  CANCELLED: [CycleStatus.DISPUTED],
  DISPUTED: [CycleStatus.OPEN, CycleStatus.LOCKED, CycleStatus.CANCELLED, CycleStatus.CLOSED],
};

/**
 * Validates whether a transition from one cycle status to another is legal.
 */
export function validateCycleTransition(
  from: CycleStatus,
  to: CycleStatus,
  isAdminOverride = false
): boolean {
  if (from === to) return true;

  // Admin override to DISPUTED is always permitted
  if (to === CycleStatus.DISPUTED && isAdminOverride) {
    return true;
  }

  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidCycleTransitionError(
      `Illegal cycle transition from '${from}' to '${to}'. Allowed transitions from '${from}': [${allowed ? allowed.join(", ") : "none"}].`
    );
  }

  return true;
}

/**
 * Pre-condition for DRAFT -> OPEN:
 * Blocks cycle opening if any food SKU lacks an FSSAI license number.
 */
export function validateFoodSkusForCycleOpen(skus: FoodSkuCheck[]): void {
  const violating = skus.filter(
    (s) => s.isFood && (!s.fssaiNumber || s.fssaiNumber.trim().length !== 14)
  );

  if (violating.length > 0) {
    const names = violating.map((s) => s.skuName).join(", ");
    throw new InvalidCycleTransitionError(
      `Cannot open cycle: Food SKU(s) [${names}] lack a valid 14-digit FSSAI license number.`
    );
  }
}

/**
 * Checks whether a cycle meets the minimum society requirements at lock time.
 * If total society value or unique households threshold is not met,
 * the cycle must branch to CANCELLED and trigger full refunds.
 */
export function evaluateSocietyMinimums(check: CycleMinimumsCheck): {
  meetsMinimum: boolean;
  reason?: string;
} {
  if (check.totalValuePaise < check.minSocietyValuePaise) {
    return {
      meetsMinimum: false,
      reason: `Total pooled society order value of ${formatINR(check.totalValuePaise)} is below required minimum of ${formatINR(check.minSocietyValuePaise)}.`,
    };
  }

  if (check.uniqueHouseholds < check.minHouseholds) {
    return {
      meetsMinimum: false,
      reason: `Unique participating households (${check.uniqueHouseholds}) is below required minimum of ${check.minHouseholds}.`,
    };
  }

  return { meetsMinimum: true };
}
