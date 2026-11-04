import { describe, it, expect } from "vitest";
import { formatINR, paiseToWholeRupees, rupeesToPaise } from "@/lib/money";

describe("Money Utilities (Rule 1 & Rule 8)", () => {
  it("formats standard integer paise into Indian currency with comma grouping", () => {
    // ₹1,23,456
    expect(formatINR(12345600)).toBe("₹1,23,456");
    expect(formatINR(100)).toBe("₹1");
    expect(formatINR(5000000)).toBe("₹50,000");
    expect(formatINR(10000000)).toBe("₹1,00,000"); // 1 Lakh
    expect(formatINR(1000000000)).toBe("₹1,00,00,000"); // 1 Crore
  });

  it("formats paise with remainder properly", () => {
    expect(formatINR(12345650)).toBe("₹1,23,456.50");
    expect(formatINR(99)).toBe("₹0.99");
    expect(formatINR(5)).toBe("₹0.05");
  });

  it("formats zero and negative paise values correctly", () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(-5000)).toBe("-₹50");
    expect(formatINR(-1250)).toBe("-₹12.50");
  });

  it("throws TypeError if a float is passed (enforces Rule 1 integer paise)", () => {
    expect(() => formatINR(10.5)).toThrow(TypeError);
    expect(() => formatINR(100.001)).toThrow(TypeError);
    expect(() => paiseToWholeRupees(100.5)).toThrow(TypeError);
    expect(() => rupeesToPaise(10.5)).toThrow(TypeError);
  });

  it("converts rupees to paise and vice versa", () => {
    expect(rupeesToPaise(150)).toBe(15000);
    expect(paiseToWholeRupees(15000)).toBe(150);
    expect(paiseToWholeRupees(15099)).toBe(150);
  });
});

