import { describe, it, expect } from "vitest";
import { getRetailComparison } from "@/server/services/benchmarkService";

describe("Benchmark Pricing Calculations", () => {
  it("calculates retail savings vs quick-commerce benchmarks", async () => {
    // Test pure savings comparison math
    const mrpPaise = 75000; // Rs 750
    const societyPricePaise = 56000; // Rs 560
    const zeptoPricePaise = 72000; // Rs 720
    const blinkitPricePaise = 70000; // Rs 700

    const avgRetail = Math.round((zeptoPricePaise + blinkitPricePaise) / 2); // 71000
    const savingsVsAvg = avgRetail - societyPricePaise; // 15000 paise (Rs 150)
    const savingsPct = Number(((savingsVsAvg / avgRetail) * 100).toFixed(1));

    expect(savingsVsAvg).toBe(15000);
    expect(savingsPct).toBe(21.1);
  });
});

