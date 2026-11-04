import { test, expect } from "@playwright/test";
import { prisma } from "@/server/db/client";
import { CycleStatus, OrderStatus, PaymentStatus } from "@prisma/client";

test.describe("Milestone 5 Procurement, Shortage Refund, Packing List & Handover", () => {
  test("full flow: admin previews & sends PO -> supplier accepts & dispatches -> captain receipts with shortage & auto-refund -> packing list -> handover -> resident tax invoice", async ({
    page,
  }, testInfo) => {
    // -------------------------------------------------------------
    // Setup isolated test data for this test worker
    // -------------------------------------------------------------
    const society = await prisma.society.findFirst({
      where: { joinCode: "GGH100" },
      include: {
        flats: true,
        memberships: { include: { user: true } },
      },
    });
    if (!society) throw new Error("Demo society GGH100 not found");

    const supplier = await prisma.supplier.findFirst({
      where: { gstin: "29ABCDE1234F1Z5" },
      include: {
        quotes: {
          where: { isActive: true },
          include: {
            slabs: { orderBy: { minQty: "asc" } },
            sku: { include: { product: true } },
          },
        },
      },
    });
    if (!supplier || supplier.quotes.length === 0) {
      throw new Error("Demo supplier or quotes not found");
    }

    const quote = supplier.quotes[0];
    const flatSuffix = testInfo.project.name.includes("Mobile") ? "M1" : "D1";

    // Create unique flat for this worker
    const flat = await prisma.flat.create({
      data: {
        societyId: society.id,
        flatNumber: `X-${flatSuffix}-${Date.now().toString().slice(-4)}`,
        tower: "Tower X",
      },
    });

    // Resident
    const resident = await prisma.user.create({
      data: {
        phone: `98765${Math.floor(10000 + Math.random() * 89999)}`,
        name: `Resident ${flatSuffix}`,
        memberships: {
          create: {
            societyId: society.id,
            flatId: flat.id,
            role: "RESIDENT",
            status: "APPROVED",
          },
        },
        wallet: { create: { balancePaise: 0 } },
      },
    });

    const pickupPin = Math.floor(100000 + Math.random() * 900000).toString();

    // Create dedicated LOCKED cycle
    const cycle = await prisma.cycle.create({
      data: {
        societyId: society.id,
        name: `M5 Cycle ${flatSuffix} ${Date.now()}`,
        status: CycleStatus.LOCKED,
        opensAt: new Date(Date.now() - 7 * 86400000),
        locksAt: new Date(Date.now() - 3600000),
        deliveryTargetDate: new Date(Date.now() + 3 * 86400000),
        minSocietyValuePaise: 10000,
        minHouseholds: 1,
        cycleSkus: {
          create: {
            skuId: quote.skuId,
            pooledQuantity: 2,
            guaranteedPricePaise: 32000,
            finalPricePaise: 30000,
            chosenSupplierQuoteId: quote.id,
          },
        },
      },
    });

    // Create confirmed order
    const order = await prisma.order.create({
      data: {
        cycleId: cycle.id,
        societyId: society.id,
        userId: resident.id,
        flatId: flat.id,
        status: OrderStatus.CONFIRMED,
        totalGuaranteedPaise: 64000,
        totalFinalPaise: 60000,
        totalRefundPaise: 4000,
        pickupCode: pickupPin,
        qrCodeToken: `QR_${pickupPin}_${Date.now()}`,
        items: {
          create: {
            skuId: quote.skuId,
            quantity: 2,
            guaranteedPricePaise: 32000,
            finalPricePaise: 30000,
            refundDeltaPaise: 2000,
          },
        },
        payments: {
          create: {
            amountPaise: 64000,
            provider: "MOCK_PAYMENT",
            providerPaymentId: `pay_m5_${flatSuffix}_${Date.now()}`,
            status: PaymentStatus.SUCCESS,
          },
        },
      },
    });

    // -------------------------------------------------------------
    // Step 1: Platform Admin previews and issues Purchase Orders
    // -------------------------------------------------------------
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543200"); // Platform Admin
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/admin", { timeout: 10000 });

    // Navigate to the test cycle detail
    await page.goto(`/admin/cycles/${cycle.id}`);
    await expect(page.getByText("Purchase Orders (PO) Management")).toBeVisible();

    // Click Preview Purchase Orders
    const previewBtn = page.getByRole("button", { name: /Preview Purchase Orders/i });
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // Verify Proposed PO table appears with wholesale suppliers
    await expect(page.getByText(/Proposed Purchase Orders/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Issue & Send POs to Suppliers/i)).toBeVisible();

    // Send POs (accept window alert/confirm)
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /Issue & Send POs to Suppliers/i }).click();

    // Verify PO status badge ISSUED
    await expect(page.getByText("ISSUED").first()).toBeVisible({ timeout: 10000 });

    // Retrieve the exact PO generated for this cycle
    const po = await prisma.purchaseOrder.findFirst({
      where: { cycleId: cycle.id },
      include: { items: true },
    });
    if (!po) throw new Error("Purchase order was not created for test cycle");

    // -------------------------------------------------------------
    // Step 2: Supplier logs in, confirms PO, uploads invoice, and dispatches
    // -------------------------------------------------------------
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543301"); // Apex Agro Wholesaler
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/supplier", { timeout: 10000 });

    // Visit the specific Purchase Order
    await page.goto(`/supplier/purchase-orders/${po.id}`);
    await expect(page.getByText(po.poNumber)).toBeVisible();

    // Confirm the PO
    const acceptBtn = page.getByRole("button", { name: /Accept & Confirm PO/i });
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
      await expect(page.getByText("CONFIRMED").first()).toBeVisible({ timeout: 5000 });
    }

    // Upload Tax Invoice
    await page.getByRole("button", { name: /Upload Tax Invoice/i }).click();
    await page.getByPlaceholder(/storage.supplier.com/i).fill("https://cloud.wholesaler.com/invoices/INV-2026-M5.pdf");
    await page.getByRole("button", { name: /Save Invoice Reference/i }).click();
    await expect(page.getByText("Invoice Attached")).toBeVisible({ timeout: 5000 });

    // Mark PO Dispatched
    const dispatchBtn = page.getByRole("button", { name: /Mark Dispatched/i });
    await expect(dispatchBtn).toBeVisible();
    await dispatchBtn.click();
    await expect(page.getByText("DISPATCHED").first()).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------
    // Step 3: Captain receives shipment with 1 unit shortage
    // -------------------------------------------------------------
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543210"); // Captain Vikram Sharma
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/captain", { timeout: 10000 });

    // Visit Goods Receipt
    await page.goto("/captain/goods-receipt");
    await expect(page.getByText("Record Goods Receipt")).toBeVisible();

    // Select this specific PO
    const targetPoBtn = page.locator("button", { hasText: po.poNumber });
    await expect(targetPoBtn).toBeVisible();
    await targetPoBtn.click();

    // Expected quantity is 2. Let's record received as 1 (simulating shortage)
    const qtyInput = page.locator("input[type='number']").first();
    await qtyInput.fill("1");

    // Enter discrepancy note
    const noteInput = page.getByPlaceholder(/carton damaged in transit/i).first();
    if (await noteInput.isVisible()) {
      await noteInput.fill("1 bag damaged in delivery vehicle");
    }

    // Confirm Goods Receipt
    await page.getByRole("button", { name: /Confirm Goods Receipt/i }).click();

    // Assert auto-refund and shortage handling banner
    await expect(page.getByText("Goods Receipt Recorded Successfully!")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Shortage Discrepancies Handled/i)).toBeVisible();
    await expect(page.getByText(/credited their digital wallets with short-supply refunds/i)).toBeVisible();

    // -------------------------------------------------------------
    // Step 4: Captain verifies Per-Flat Packing Sheet matches orders
    // -------------------------------------------------------------
    await page.goto(`/captain/packing-list?cycleId=${cycle.id}`);
    await expect(page.getByText("Per-Flat Distribution & Packing List")).toBeVisible();

    // Verify flat is listed with pickup PIN
    await expect(page.getByText(flat.flatNumber)).toBeVisible();
    await expect(page.getByText(pickupPin)).toBeVisible();

    // Verify net deliverable unit is 1, and shortage refund is noted
    await expect(page.getByText(/Short: 1 \(Refunded\)/i)).toBeVisible();
    await expect(page.getByText("1 Net Units to Distribute", { exact: false })).toBeVisible();

    // -------------------------------------------------------------
    // Step 5: Captain verifies order PIN and records Handover
    // -------------------------------------------------------------
    await page.goto("/captain/handover");
    await expect(page.getByText("Resident Pickup & Handover")).toBeVisible();

    // Enter resident pickup PIN
    await page.getByPlaceholder(/849201 or QR Token/i).fill(pickupPin);
    await page.getByRole("button", { name: /Verify Order/i }).click();

    // Order card appears
    await expect(page.getByText(flat.flatNumber)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(resident.name!)).toBeVisible();
    await expect(page.getByText(/Short: 1 \(Refunded\)/i)).toBeVisible();

    // Complete Handover
    await page.getByRole("button", { name: /Complete Handover/i }).click();
    await expect(page.getByText(/marked as fully HANDED OVER to resident!/i)).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------
    // Step 6: Resident views Official GST Tax Invoice
    // -------------------------------------------------------------
    await page.goto(`/orders/${order.id}/invoice`);
    await expect(page.getByText("Tax Invoice", { exact: true })).toBeVisible();
    await expect(page.getByText("SocietyBuy Technologies Private Limited")).toBeVisible();

    // Verify statutory placeholders marked TODO_LEGAL
    await expect(page.getByText(/\(TODO_LEGAL\)/i).first()).toBeVisible();
    await expect(page.getByText(/Registered Office:.*TODO_LEGAL/i).first()).toBeVisible();

    // Verify line item tax breakup (HSN, CGST, SGST)
    await expect(page.getByText("Description of Goods")).toBeVisible();
    await expect(page.getByText("Taxable Val")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "CGST" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "SGST" })).toBeVisible();
    await expect(page.getByText("Total Invoice Amount (INR)")).toBeVisible();
  });
});
