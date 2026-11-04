import { describe, it, expect } from "vitest";
import {
  previewPurchaseOrders,
  calculateShortSupplyAllocations,
  CycleSkuWithWinningQuote,
  OrderItemForShortage,
} from "@/server/domain/procurement";

describe("Procurement Domain & Purchase Order Aggregation", () => {
  it("groups winning supplier quotes and pooled quantities into proposed purchase orders", () => {
    const cycleSkus: CycleSkuWithWinningQuote[] = [
      {
        skuId: "sku_1",
        sku: {
          id: "sku_1",
          variantName: "10kg Bag",
          packSize: 10,
          unit: "kg",
          mrpPaise: 45000,
          product: {
            name: "Chakki Atta",
            brand: "Aashirvaad",
            isFood: true,
            fssaiNumber: "11223344556677",
            category: { name: "Atta & Flours" },
          },
        },
        pooledQuantity: 50,
        finalPricePaise: 38000,
        finalSupplierPricePaise: 32000,
        winningSupplierId: "sup_apex",
        winningSupplierQuote: {
          id: "quote_1",
          supplierId: "sup_apex",
          supplier: {
            id: "sup_apex",
            name: "Apex Agro Wholesale",
            rating: 4.8,
          },
          leadTimeDays: 2,
          moq: 10,
        },
      },
      {
        skuId: "sku_2",
        sku: {
          id: "sku_2",
          variantName: "5L Can",
          packSize: 5,
          unit: "L",
          mrpPaise: 75000,
          product: {
            name: "Sunflower Oil",
            brand: "Fortune",
            isFood: true,
            fssaiNumber: "11223344556677",
            category: { name: "Edible Oils" },
          },
        },
        pooledQuantity: 30,
        finalPricePaise: 65000,
        finalSupplierPricePaise: 58000,
        winningSupplierId: "sup_apex",
        winningSupplierQuote: {
          id: "quote_2",
          supplierId: "sup_apex",
          supplier: {
            id: "sup_apex",
            name: "Apex Agro Wholesale",
            rating: 4.8,
          },
          leadTimeDays: 2,
          moq: 5,
        },
      },
      {
        skuId: "sku_3",
        sku: {
          id: "sku_3",
          variantName: "4kg Tub",
          packSize: 4,
          unit: "kg",
          mrpPaise: 55000,
          product: {
            name: "Matic Front Load",
            brand: "Surf Excel",
            isFood: false,
            fssaiNumber: null,
            category: { name: "Detergents" },
          },
        },
        pooledQuantity: 25,
        finalPricePaise: 48000,
        finalSupplierPricePaise: 42000,
        winningSupplierId: "sup_metro",
        winningSupplierQuote: {
          id: "quote_3",
          supplierId: "sup_metro",
          supplier: {
            id: "sup_metro",
            name: "Metro Bulk Essentials",
            rating: 4.6,
          },
          leadTimeDays: 3,
          moq: 10,
        },
      },
    ];

    const pos = previewPurchaseOrders(cycleSkus);

    expect(pos).toHaveLength(2); // 2 suppliers: Apex Agro and Metro Bulk

    const apexPo = pos.find((p) => p.supplierId === "sup_apex");
    expect(apexPo).toBeDefined();
    expect(apexPo?.supplierName).toBe("Apex Agro Wholesale");
    expect(apexPo?.items).toHaveLength(2);
    // Atta: 50 * 32,000 paise = 1,600,000 paise
    // Oil: 30 * 58,000 paise = 1,740,000 paise
    // Total = 3,340,000 paise
    expect(apexPo?.totalAmountPaise).toBe(3340000);
    expect(apexPo?.totalUnits).toBe(80);

    const metroPo = pos.find((p) => p.supplierId === "sup_metro");
    expect(metroPo).toBeDefined();
    expect(metroPo?.items).toHaveLength(1);
    expect(metroPo?.totalAmountPaise).toBe(25 * 42000); // 1,050,000 paise
  });

  it("calculates short supply allocations and refund amounts in integer paise", () => {
    const orderItems: OrderItemForShortage[] = [
      {
        id: "item_1",
        orderId: "order_1",
        skuId: "sku_atta",
        quantity: 2,
        finalPricePaise: 38000,
        order: {
          id: "order_1",
          userId: "user_1",
          flat: { flatNumber: "A-101", tower: "Tower A" },
        },
      },
      {
        id: "item_2",
        orderId: "order_2",
        skuId: "sku_atta",
        quantity: 3,
        finalPricePaise: 38000,
        order: {
          id: "order_2",
          userId: "user_2",
          flat: { flatNumber: "A-102", tower: "Tower A" },
        },
      },
      {
        id: "item_3",
        orderId: "order_3",
        skuId: "sku_atta",
        quantity: 1,
        finalPricePaise: 38000,
        order: {
          id: "order_3",
          userId: "user_3",
          flat: { flatNumber: "B-201", tower: "Tower B" },
        },
      },
    ];

    // Total ordered: 6 units. Suppose supplier only delivered 4 units -> shortage = 2 units
    const shortageResult = calculateShortSupplyAllocations("sku_atta", 2, orderItems);

    expect(shortageResult.affectedOrderItems).toHaveLength(1);
    expect(shortageResult.affectedOrderItems[0].orderItemId).toBe("item_1");
    expect(shortageResult.affectedOrderItems[0].shortQty).toBe(2);
    expect(shortageResult.affectedOrderItems[0].deliveredQty).toBe(0);
    expect(shortageResult.affectedOrderItems[0].refundAmountPaise).toBe(2 * 38000); // 76,000 paise
    expect(shortageResult.totalRefundPaise).toBe(76000);
  });

  it("allocates shortage across multiple orders when shortage exceeds single order quantity", () => {
    const orderItems: OrderItemForShortage[] = [
      {
        id: "item_1",
        orderId: "order_1",
        skuId: "sku_ghee",
        quantity: 1,
        finalPricePaise: 50000,
        order: {
          id: "order_1",
          userId: "user_1",
          flat: { flatNumber: "A-101", tower: "Tower A" },
        },
      },
      {
        id: "item_2",
        orderId: "order_2",
        skuId: "sku_ghee",
        quantity: 2,
        finalPricePaise: 50000,
        order: {
          id: "order_2",
          userId: "user_2",
          flat: { flatNumber: "A-102", tower: "Tower A" },
        },
      },
    ];

    // Shortage of 2 units
    const result = calculateShortSupplyAllocations("sku_ghee", 2, orderItems);

    expect(result.affectedOrderItems).toHaveLength(2);
    // Order 1 gets 1 short (delivered: 0)
    expect(result.affectedOrderItems[0].shortQty).toBe(1);
    expect(result.affectedOrderItems[0].refundAmountPaise).toBe(50000);
    // Order 2 gets 1 short (delivered: 1)
    expect(result.affectedOrderItems[1].shortQty).toBe(1);
    expect(result.affectedOrderItems[1].deliveredQty).toBe(1);
    expect(result.affectedOrderItems[1].refundAmountPaise).toBe(50000);

    expect(result.totalRefundPaise).toBe(100000); // Rs 1,000 total
  });
});

