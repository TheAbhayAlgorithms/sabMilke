import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/server/db/client";
import {
  generateAndSendPurchaseOrders,
  confirmPurchaseOrder,
  dispatchPurchaseOrder,
  previewPurchaseOrdersForCycle,
} from "@/server/services/purchaseOrderService";
import { recordGoodsReceipt } from "@/server/services/goodsReceiptService";
import {
  getPerFlatPackingList,
  getHandoverOrderByPinOrQr,
  recordOrderHandover,
} from "@/server/services/distributionService";
import { generateResidentInvoice } from "@/server/services/invoiceService";
import {
  CycleStatus,
  OrderStatus,
  PurchaseOrderStatus,
  Role,
  MembershipStatus,
  WalletTxType,
} from "@prisma/client";

describe("Milestone 5 Procurement, Goods Receipt, Distribution & Invoicing", () => {
  let testSocietyId: string;
  let testCycleId: string;
  let testSupplierId: string;
  let testSkuId: string;
  let testUserId: string;
  let testOrderId: string;
  let testFlatId: string;
  let testPickupCode: string;
  let testQrToken: string;

  beforeAll(async () => {
    // 1. Setup isolated test society & flat
    const society = await prisma.society.create({
      data: {
        name: "Test Palm Meadows",
        slug: `test-palm-meadows-${Date.now()}`,
        joinCode: `TPM${Math.floor(100 + Math.random() * 899)}`,
        addressLine: "Whitefield Main Road",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560066",
        dropPoints: {
          create: {
            name: "Tower A Basement Lobby",
            instructions: "Deliver to dock 2",
          },
        },
        flats: {
          create: {
            flatNumber: "C-301",
            tower: "Tower C",
          },
        },
      },
      include: { flats: true, dropPoints: true },
    });
    testSocietyId = society.id;
    testFlatId = society.flats[0].id;

    // 2. Setup user with resident membership & wallet
    const user = await prisma.user.create({
      data: {
        phone: `98765${Math.floor(80000 + Math.random() * 19999)}`,
        name: "Devendra Verma",
        wallet: { create: { balancePaise: 0 } },
        memberships: {
          create: {
            societyId: testSocietyId,
            flatId: testFlatId,
            role: Role.RESIDENT,
            status: MembershipStatus.APPROVED,
          },
        },
      },
    });
    testUserId = user.id;

    // 3. Setup supplier
    const randomGstin = `29ABCD${Math.floor(1000 + Math.random() * 8999)}F1Z5`;
    const supplier = await prisma.supplier.create({
      data: {
        name: "Kisan Direct Wholesale",
        legalName: "Kisan Direct Logistics Pvt Ltd",
        gstin: randomGstin,
        phone: `98765${Math.floor(60000 + Math.random() * 39999)}`,
        email: `orders_${Date.now()}@kisandirect.in`,
        rating: 4.9,
      },
    });
    testSupplierId = supplier.id;

    // 4. Setup Category, Product & Sku
    const category = await prisma.category.findFirst() || await prisma.category.create({
      data: { name: "Pulses Test", slug: `pulses-test-${Date.now()}` },
    });

    const product = await prisma.product.create({
      data: {
        name: "Organic Toor Dal",
        brand: "Tata Sampann",
        categoryId: category.id,
        isFood: true,
        fssaiNumber: "11223344556677",
        hsnCode: "11010000",
        gstRate: 5.0,
      },
    });

    const sku = await prisma.sku.create({
      data: {
        productId: product.id,
        variantName: "2kg Pouch",
        packSize: 2,
        unit: "kg",
        mrpPaise: 38000, // Rs 380
        marginPercent: 5,
        marginMinPaise: 1000,
      },
    });
    testSkuId = sku.id;

    // 5. Setup quote with slabs
    const quote = await prisma.supplierQuote.create({
      data: {
        supplierId: testSupplierId,
        skuId: testSkuId,
        validFrom: new Date(Date.now() - 86400000),
        validTo: new Date(Date.now() + 86400000 * 30),
        leadTimeDays: 2,
        moq: 5,
        slabs: {
          create: [
            { minQty: 1, maxQty: 10, supplierPricePaise: 30000 },
            { minQty: 11, maxQty: 50, supplierPricePaise: 27000 },
          ],
        },
      },
    });

    // 6. Setup LOCKED cycle with winning quote
    const cycle = await prisma.cycle.create({
      data: {
        name: "November 2026 Procurement Cycle",
        societyId: testSocietyId,
        status: CycleStatus.LOCKED,
        opensAt: new Date(Date.now() - 86400000 * 5),
        locksAt: new Date(Date.now() - 86400000),
        deliveryTargetDate: new Date(Date.now() + 86400000 * 3),
        minSocietyValuePaise: 100000,
        minHouseholds: 1,
        cycleSkus: {
          create: {
            skuId: testSkuId,
            pooledQuantity: 5,
            guaranteedPricePaise: 32000,
            finalPricePaise: 32000,
            chosenSupplierQuoteId: quote.id,
          },
        },
      },
    });
    testCycleId = cycle.id;

    testPickupCode = Math.floor(100000 + Math.random() * 900000).toString();
    testQrToken = `QR_${testPickupCode}_${Math.random().toString(36).substring(2, 8)}`;

    // 7. Setup paid order for the flat
    const order = await prisma.order.create({
      data: {
        cycleId: testCycleId,
        societyId: testSocietyId,
        userId: testUserId,
        flatId: testFlatId,
        status: OrderStatus.CONFIRMED,
        totalGuaranteedPaise: 32000 * 2, // 2 units
        totalFinalPaise: 32000 * 2,
        totalRefundPaise: 0,
        pickupCode: testPickupCode,
        qrCodeToken: testQrToken,
        items: {
          create: {
            skuId: testSkuId,
            quantity: 2,
            guaranteedPricePaise: 32000,
            finalPricePaise: 32000,
          },
        },
      },
    });
    testOrderId = order.id;
  });

  it("previews and generates purchase orders, updating cycle to PO_SENT", async () => {
    // 1. Preview POs
    const preview = await previewPurchaseOrdersForCycle(testCycleId);
    expect(preview).toHaveLength(1);
    expect(preview[0].supplierId).toBe(testSupplierId);
    expect(preview[0].totalUnits).toBe(5);
    expect(preview[0].totalAmountPaise).toBe(5 * 30000); // 150,000 paise

    // 2. Generate and send POs
    const result = await generateAndSendPurchaseOrders(testUserId, testCycleId);
    expect(result.success).toBe(true);
    expect(result.cycle.status).toBe(CycleStatus.PO_SENT);
    expect(result.purchaseOrders).toHaveLength(1);

    const po = result.purchaseOrders[0];
    expect(po.status).toBe(PurchaseOrderStatus.ISSUED);
    expect(po.poNumber).toMatch(/^PO-\d{4}-TPM/);
    expect(po.items).toHaveLength(1);
    expect(po.items[0].orderedQuantity).toBe(5);

    // Order status updated to ALLOCATED
    const updatedOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
    });
    expect(updatedOrder?.status).toBe(OrderStatus.ALLOCATED);
  });

  it("supplier confirms and dispatches the purchase order", async () => {
    const po = await prisma.purchaseOrder.findFirst({
      where: { cycleId: testCycleId },
    });
    expect(po).toBeDefined();

    // Supplier confirms PO
    const confirmed = await confirmPurchaseOrder(testUserId, po!.id);
    expect(confirmed.status).toBe(PurchaseOrderStatus.CONFIRMED);

    // Supplier marks dispatched
    const dispatched = await dispatchPurchaseOrder(testUserId, po!.id);
    expect(dispatched.status).toBe(PurchaseOrderStatus.DISPATCHED);
    expect(dispatched.dispatchedAt).toBeInstanceOf(Date);
  });

  it("records goods receipt with 1 unit shortage, executes auto-refund and moves cycle to PARTIAL", async () => {
    const po = await prisma.purchaseOrder.findFirst({
      where: { cycleId: testCycleId },
    });
    expect(po).toBeDefined();

    // PO ordered 5 units. Truck arrives with only 4 units -> 1 shortage
    const receiptResult = await recordGoodsReceipt({
      actorId: testUserId,
      purchaseOrderId: po!.id,
      receivedItems: [
        {
          skuId: testSkuId,
          receivedQty: 4, // 1 shortage!
          discrepancyNote: "1 pouch split open and rejected at dock",
        },
      ],
      notes: "Received at Tower A dock",
    });

    expect(receiptResult.success).toBe(true);
    expect(receiptResult.hasShortage).toBe(true);

    // Cycle updated to PARTIAL per state machine
    const updatedCycle = await prisma.cycle.findUnique({
      where: { id: testCycleId },
    });
    expect(updatedCycle?.status).toBe(CycleStatus.PARTIAL);

    // Order updated to SHORT_SUPPLIED and totalRefundPaise credited
    const updatedOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { items: true },
    });
    expect(updatedOrder?.status).toBe(OrderStatus.SHORT_SUPPLIED);
    expect(updatedOrder?.totalRefundPaise).toBe(32000); // 1 unit * 32,000 paise
    expect(updatedOrder?.items[0].shortSuppliedQty).toBe(1);

    // Resident wallet credited with SHORT_SUPPLY_REFUND
    const wallet = await prisma.wallet.findUnique({
      where: { userId: testUserId },
      include: { transactions: true },
    });
    expect(wallet?.balancePaise).toBe(32000);
    expect(wallet?.transactions.some((t) => t.type === WalletTxType.SHORT_SUPPLY_REFUND)).toBe(true);

    // Refund record created
    const refund = await prisma.refund.findFirst({
      where: { orderId: testOrderId, reason: WalletTxType.SHORT_SUPPLY_REFUND },
    });
    expect(refund).toBeDefined();
    expect(refund?.amountPaise).toBe(32000);
  });

  it("generates per-flat packing list matching net delivered quantities", async () => {
    const packingList = await getPerFlatPackingList(testCycleId, testSocietyId);

    expect(packingList.flats).toHaveLength(1);
    const flatGroup = packingList.flats[0];
    expect(flatGroup.flatNumber).toBe("C-301");
    expect(flatGroup.pickupCode).toBe(testPickupCode);
    expect(flatGroup.qrCodeToken).toBe(testQrToken);

    // Ordered 2, 1 shortage -> net deliverable = 1 unit!
    expect(flatGroup.items).toHaveLength(1);
    expect(flatGroup.items[0].orderedQty).toBe(2);
    expect(flatGroup.items[0].shortQty).toBe(1);
    expect(flatGroup.items[0].netQty).toBe(1);
    expect(flatGroup.totalUnits).toBe(1);
  });

  it("allows looking up order by pickup PIN / QR and recording partial then full collection", async () => {
    // Lookup by 6-digit PIN
    const order = await getHandoverOrderByPinOrQr({
      code: testPickupCode,
      societyId: testSocietyId,
    });
    expect(order.id).toBe(testOrderId);
    expect(order.user.name).toBe("Devendra Verma");

    // Partial collection (resident takes only 1 item or partial)
    const partialHandover = await recordOrderHandover({
      actorId: testUserId,
      orderId: testOrderId,
      isPartial: true,
      collectedItems: [{ skuId: testSkuId, quantity: 1 }],
      notes: "Resident collected toor dal",
    });
    expect(partialHandover.success).toBe(true);
    expect(partialHandover.handoverEvent.isPartial).toBe(true);

    // Full final collection
    const finalHandover = await recordOrderHandover({
      actorId: testUserId,
      orderId: testOrderId,
      isPartial: false,
    });
    expect(finalHandover.success).toBe(true);
    expect(finalHandover.order.status).toBe(OrderStatus.HANDED_OVER);
  });

  it("generates statutory resident tax invoice with GST breakdown and TODO_LEGAL metadata", async () => {
    const invoice = await generateResidentInvoice(testOrderId);

    expect(invoice.invoiceNumber).toMatch(/^INV-/);
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.lines[0].billedQuantity).toBe(1); // Net deliverable 1 unit
    expect(invoice.lines[0].grossAmountPaise).toBe(32000);
    expect(invoice.totalAmountPaise).toBe(32000);

    // GST breakdown
    expect(invoice.totalTaxablePaise + invoice.totalCgstPaise + invoice.totalSgstPaise).toBe(32000);
    expect(invoice.legalEntity.companyName).toContain("TODO_LEGAL");
    expect(invoice.legalEntity.gstin).toContain("TODO_LEGAL");
  });
});
