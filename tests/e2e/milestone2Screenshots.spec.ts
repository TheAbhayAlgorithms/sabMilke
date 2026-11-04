import { test } from "@playwright/test";
import fs from "fs";

test.describe("Milestone 2 Screenshots", () => {
  test("capture admin and supplier screens", async ({ page }) => {
    fs.mkdirSync("public/screenshots", { recursive: true });

    // 1. Admin Catalogue
    await page.goto("/login");
    await page.getByText("Platform Admin").click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/admin", { timeout: 10000 });

    await page.goto("/admin/catalogue");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/admin-catalogue.png", fullPage: true });

    // 2. CSV Import Modal
    await page.getByRole("button", { name: "Bulk CSV Import" }).click();
    await page.getByRole("button", { name: "Load Sample CSV" }).click();
    await page.getByRole("button", { name: "Validate & Import" }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "public/screenshots/admin-csv-import.png" });

    // 3. Admin Quotes Comparison
    await page.goto("/admin/quotes");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/admin-quotes-comparison.png", fullPage: true });

    // 4. Supplier Quotes Portal
    await page.goto("/login");
    await page.getByText("Wholesale Supplier").click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/supplier", { timeout: 10000 });

    await page.goto("/supplier/quotes");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/supplier-quotes.png", fullPage: true });

    // Open Edit Slabs modal
    await page.getByRole("button", { name: /Edit Slabs|Submit Quote/i }).first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "public/screenshots/supplier-edit-slabs-modal.png" });
  });
});

