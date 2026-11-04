import { describe, it, expect } from "vitest";
import {
  validateCycleTransition,
  validateFoodSkusForCycleOpen,
  evaluateSocietyMinimums,
  InvalidCycleTransitionError,
} from "@/server/domain/cycleStateMachine";
import { CycleStatus } from "@prisma/client";

describe("Cycle State Machine (Section 3.1 & Rule 6)", () => {
  it("allows the standard linear progression of cycle statuses", () => {
    expect(validateCycleTransition(CycleStatus.DRAFT, CycleStatus.OPEN)).toBe(true);
    expect(validateCycleTransition(CycleStatus.OPEN, CycleStatus.LOCKED)).toBe(true);
    expect(validateCycleTransition(CycleStatus.LOCKED, CycleStatus.PO_SENT)).toBe(true);
    expect(validateCycleTransition(CycleStatus.PO_SENT, CycleStatus.RECEIVED)).toBe(true);
    expect(validateCycleTransition(CycleStatus.RECEIVED, CycleStatus.DISTRIBUTING)).toBe(true);
    expect(validateCycleTransition(CycleStatus.DISTRIBUTING, CycleStatus.CLOSED)).toBe(true);
  });

  it("allows legitimate exit transitions", () => {
    // OPEN -> CANCELLED (society minimums not met at lock)
    expect(validateCycleTransition(CycleStatus.OPEN, CycleStatus.CANCELLED)).toBe(true);
    // PO_SENT -> PARTIAL (short supply)
    expect(validateCycleTransition(CycleStatus.PO_SENT, CycleStatus.PARTIAL)).toBe(true);
    // PARTIAL -> RECEIVED
    expect(validateCycleTransition(CycleStatus.PARTIAL, CycleStatus.RECEIVED)).toBe(true);
  });

  it("allows admin override to DISPUTED from any status", () => {
    expect(validateCycleTransition(CycleStatus.OPEN, CycleStatus.DISPUTED, true)).toBe(true);
    expect(validateCycleTransition(CycleStatus.LOCKED, CycleStatus.DISPUTED, true)).toBe(true);
    expect(validateCycleTransition(CycleStatus.CLOSED, CycleStatus.DISPUTED, true)).toBe(true);
  });

  it("throws InvalidCycleTransitionError on illegal jumps", () => {
    expect(() => validateCycleTransition(CycleStatus.DRAFT, CycleStatus.CLOSED)).toThrow(
      InvalidCycleTransitionError
    );
    expect(() => validateCycleTransition(CycleStatus.DRAFT, CycleStatus.DISTRIBUTING)).toThrow(
      InvalidCycleTransitionError
    );
    expect(() => validateCycleTransition(CycleStatus.OPEN, CycleStatus.CLOSED)).toThrow(
      InvalidCycleTransitionError
    );
    expect(() => validateCycleTransition(CycleStatus.CLOSED, CycleStatus.OPEN)).toThrow(
      InvalidCycleTransitionError
    );
  });

  it("validateFoodSkusForCycleOpen blocks opening if any food SKU lacks FSSAI", () => {
    const invalidFood = [
      { isFood: true, fssaiNumber: "10012011000123", skuName: "Rice" },
      { isFood: true, fssaiNumber: "", skuName: "Atta (No FSSAI)" }, // VIOLATION!
      { isFood: false, fssaiNumber: null, skuName: "Detergent" },
    ];

    expect(() => validateFoodSkusForCycleOpen(invalidFood)).toThrow(InvalidCycleTransitionError);
    expect(() => validateFoodSkusForCycleOpen(invalidFood)).toThrow(/lack a valid 14-digit FSSAI/);
  });

  it("validateFoodSkusForCycleOpen blocks opening if food FSSAI is not 14 digits", () => {
    const shortFssai = [
      { isFood: true, fssaiNumber: "12345", skuName: "Ghee" },
    ];
    expect(() => validateFoodSkusForCycleOpen(shortFssai)).toThrow(InvalidCycleTransitionError);
  });

  it("validateFoodSkusForCycleOpen passes when all food SKUs have 14-digit FSSAI", () => {
    const valid = [
      { isFood: true, fssaiNumber: "10012011000123", skuName: "Rice" },
      { isFood: true, fssaiNumber: "10012011000124", skuName: "Atta" },
      { isFood: false, fssaiNumber: null, skuName: "Dishwash" },
    ];
    expect(() => validateFoodSkusForCycleOpen(valid)).not.toThrow();
  });

  it("evaluateSocietyMinimums detects minimum value shortfall", () => {
    const result = evaluateSocietyMinimums({
      totalValuePaise: 4500000, // Rs 45,000
      uniqueHouseholds: 15,
      minSocietyValuePaise: 5000000, // Rs 50,000 required
      minHouseholds: 10,
    });

    expect(result.meetsMinimum).toBe(false);
    expect(result.reason).toContain("below required minimum of ₹50,000");
  });

  it("evaluateSocietyMinimums detects households count shortfall", () => {
    const result = evaluateSocietyMinimums({
      totalValuePaise: 6000000, // Rs 60,000
      uniqueHouseholds: 8,      // Only 8 flats
      minSocietyValuePaise: 5000000,
      minHouseholds: 10,        // 10 required
    });

    expect(result.meetsMinimum).toBe(false);
    expect(result.reason).toContain("Unique participating households (8) is below required minimum of 10");
  });

  it("evaluateSocietyMinimums passes when both value and households thresholds are met", () => {
    const result = evaluateSocietyMinimums({
      totalValuePaise: 6500000,
      uniqueHouseholds: 12,
      minSocietyValuePaise: 5000000,
      minHouseholds: 10,
    });

    expect(result.meetsMinimum).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

