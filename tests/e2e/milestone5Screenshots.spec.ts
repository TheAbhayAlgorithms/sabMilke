import { test } from "@playwright/test";
import { prisma } from "@/server/db/client";

test.describe("Milestone 5 Screenshot Capture", () => {
  test("capture screenshots for PO preview, supplier dispatch, goods receipt, packing list, handover, and resident invoice", async ({
    page,
  }) => {
    // 1. Admin Cycle & PO Preview
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543200"); // Admin
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/admin", { timeout: 10000 });

    // Find latest cycle
    const cycle = await prisma.cycle.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (cycle) {
      await page.goto(`/admin/cycles/${cycle.id}`);
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: "tests/e2e/screenshots/admin-po-preview.png",
        fullPage: true,
      });
    }

    // 2. Supplier PO List
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543301"); // Supplier
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/supplier", { timeout: 10000 });

    await page.goto("/supplier/purchase-orders");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: "tests/e2e/screenshots/supplier-po-list.png",
      fullPage: true,
    });

    // Supplier PO Detail
    const po = await prisma.purchaseOrder.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (po) {
      await page.goto(`/supplier/purchase-orders/${po.id}`);
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: "tests/e2e/screenshots/supplier-po-detail.png",
        fullPage: true,
      });
    }

    // 3. Captain Goods Receipt & Packing List & Handover
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543210"); // Captain
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/captain", { timeout: 10000 });

    await page.goto("/captain/goods-receipt");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: "tests/e2e/screenshots/captain-goods-receipt.png",
      fullPage: true,
    });

    if (cycle) {
      await page.goto(`/captain/packing-list?cycleId=${cycle.id}`);
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: "tests/e2e/screenshots/captain-packing-list.png",
        fullPage: true,
      });
    }

    await page.goto("/captain/handover");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: "tests/e2e/screenshots/captain-handover-scan.png",
      fullPage: true,
    });

    // 4. Resident Tax Invoice
    const order = await prisma.order.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (order) {
      await page.goto(`/orders/${order.id}/invoice`);
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: "tests/e2e/screenshots/resident-tax-invoice.png",
        fullPage: true,
      });
    }
  });
});
