import { describe, it, expect } from "vitest";
import {
  computePlatformAnalytics,
  computeSocietyAdminAnalytics,
} from "@/server/domain/analytics";

describe("Analytics Pure Domain Engines", () => {
  describe("computePlatformAnalytics", () => {
    it("computes platform GMV, participation, fill rate, and savings correctly", () => {
      const result = computePlatformAnalytics({
        societies: [
          { id: "soc-1", name: "Green Glen", joinCode: "GGH1", flatsCount: 100 },
          { id: "soc-2", name: "Silver Springs", joinCode: "SS2", flatsCount: 50 },
        ],
        orders: [
          {
            id: "ord-1",
            societyId: "soc-1",
            flatId: "flat-101",
            totalGuaranteedPaise: 250000,
            totalFinalPaise: 220000, // Rs 300 savings
            totalRefundPaise: 30000,
            items: [
              {
                quantity: 2,
                guaranteedPricePaise: 125000,
                finalPricePaise: 110000,
                benchmarkPricePaise: 140000, // Rs 300 retail saving per unit -> 600 total
              },
            ],
          },
          {
            id: "ord-2",
            societyId: "soc-1",
            flatId: "flat-102",
            totalGuaranteedPaise: 100000,
            totalFinalPaise: 100000,
            totalRefundPaise: 0,
            items: [],
          },
        ],
        purchaseOrders: [
          {
            id: "po-1",
            supplierId: "sup-1",
            supplierName: "Apex Agro",
            supplierRating: 4.8,
            totalAmountPaise: 250000,
            items: [{ orderedQuantity: 50 }],
            goodsReceipts: [
              {
                items: [{ receivedQty: 48, shortQty: 2 }],
              },
            ],
          },
        ],
        refunds: [{ amountPaise: 30000 }],
      });

      // GMV = 220000 + 100000 = 320000 paise (Rs 3,200)
      expect(result.gmvPaise).toBe(320000);
      expect(result.totalOrders).toBe(2);
      expect(result.totalParticipatingHouseholds).toBe(2);
      expect(result.totalFlatsAcrossSocieties).toBe(150);
      // Participation: 2 / 150 = 1.3%
      expect(result.overallParticipationPercent).toBe(1.3);

      // Supplier fill rate: 48 / 50 = 96%
      expect(result.supplierFillRatePercent).toBe(96);

      // Refund rate: 30000 / 320000 = 9.38%
      expect(result.totalRefundsPaise).toBe(30000);
      expect(result.refundRatePercent).toBe(9.38);

      // Society contributions breakdown
      expect(result.societies.length).toBe(2);
      const soc1 = result.societies.find((s) => s.societyId === "soc-1");
      expect(soc1?.gmvPaise).toBe(320000);
      expect(soc1?.participatingFlats).toBe(2);
      expect(soc1?.participationPercent).toBe(2); // 2/100 = 2%
    });
  });

  describe("computeSocietyAdminAnalytics", () => {
    it("computes society GMV, participating flats %, and 2% RWA community rebate", () => {
      const result = computeSocietyAdminAnalytics({
        society: {
          id: "soc-1",
          name: "Green Glen Heights",
          joinCode: "GGH100",
          totalFlats: 100,
        },
        orders: [
          {
            id: "o-1",
            cycleId: "cyc-1",
            flatId: "f-1",
            totalGuaranteedPaise: 1000000,
            totalFinalPaise: 900000, // Rs 9,000 GMV
            totalRefundPaise: 100000,
            items: [
              {
                quantity: 10,
                guaranteedPricePaise: 100000,
                finalPricePaise: 90000,
                benchmarkPricePaise: 110000, // saved 200 per unit vs retail
              },
            ],
          },
          {
            id: "o-2",
            cycleId: "cyc-1",
            flatId: "f-2",
            totalGuaranteedPaise: 500000,
            totalFinalPaise: 500000, // Rs 5,000 GMV
            totalRefundPaise: 0,
            items: [{ quantity: 5, guaranteedPricePaise: 100000, finalPricePaise: 100000 }],
          },
        ],
        cycles: [{ id: "cyc-1", name: "October 2026 Pool", status: "CLOSED" }],
        rebatePercent: 2.0,
      });

      // GMV = 900000 + 500000 = 1400000 paise (Rs 14,000)
      expect(result.gmvPaise).toBe(1400000);
      expect(result.totalOrders).toBe(2);
      expect(result.participatingFlats).toBe(2);
      expect(result.participationPercent).toBe(2.0); // 2/100 = 2%

      // 2% RWA Community Rebate = 2% of 14,000 = Rs 280 (28,000 paise)
      expect(result.societyRebatePaise).toBe(28000);

      // Units distributed
      expect(result.totalUnitsDistributed).toBe(15);

      // Cycles breakdown
      expect(result.cycles[0].gmvPaise).toBe(1400000);
      expect(result.cycles[0].participatingFlats).toBe(2);
    });
  });
});

