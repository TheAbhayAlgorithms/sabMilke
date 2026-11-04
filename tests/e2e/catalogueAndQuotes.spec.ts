import { test, expect } from "@playwright/test";

test.describe("Milestone 2: Catalogue Manager, Supplier Quotes, and Quote Comparison", () => {
  test("Supplier can view quote editor and submit volume slabs", async ({ page }) => {
    // 1. Login as Supplier (Apex Agro Wholesale)
    await page.goto("/login");
    await page.getByText("Wholesale Supplier").click();
    await expect(page.getByPlaceholder("123456")).toBeVisible();
    await page.getByRole("button", { name: /Verify & Login/i }).click();

    // 2. Should navigate to supplier portal
    await page.waitForURL("**/supplier", { timeout: 10000 });
    await expect(page.getByText("Verified Wholesaler Partner")).toBeVisible();

    // 3. Go to Quote Editor
    await page.goto("/supplier/quotes");
    await expect(page.getByText("Wholesale Quote & Slabs Manager")).toBeVisible();

    // 4. Click Edit Slabs / Submit Quote on first SKU
    const editBtn = page.getByRole("button", { name: /Edit Slabs|Submit Quote/i }).first();
    await editBtn.click();

    // 5. Modal should open with volume slabs
    await expect(page.getByText("Configure Quote & Volume Slabs")).toBeVisible();
    await expect(page.getByText("Maximum Retail Price (MRP)")).toBeVisible();

    // 6. Click Submit Quote inside the modal form
    await page.locator("form").getByRole("button", { name: "Submit Quote" }).click();

    // 7. Verify success
    await expect(page.getByText("Quote submitted successfully!")).toBeVisible();
  });

  test("Platform Admin can view catalogue, open CSV import, and compare quotes across suppliers", async ({ page }) => {
    // 1. Login as Platform Admin
    await page.goto("/login");
    await page.getByText("Platform Admin").click();
    await expect(page.getByPlaceholder("123456")).toBeVisible();
    await page.getByRole("button", { name: /Verify & Login/i }).click();

    // 2. Navigate to Admin Console
    await page.waitForURL("**/admin", { timeout: 10000 });
    await expect(page.getByText("SocietyBuy Master Operations")).toBeVisible();

    // 3. Navigate to Catalogue Manager
    await page.goto("/admin/catalogue");
    await expect(page.getByText("Platform Catalogue Manager")).toBeVisible();
    await expect(page.getByText("FSSAI enforced on all food lines")).toBeVisible();

    // 4. Open Bulk CSV Import Modal
    await page.getByRole("button", { name: "Bulk CSV Import" }).click();
    await expect(page.getByText("Bulk Catalogue CSV Import")).toBeVisible();
    await page.getByRole("button", { name: "Load Sample CSV" }).click();
    await page.getByRole("button", { name: "Validate & Import" }).click();

    // 5. Verify Import Report
    await expect(page.getByText(/Import Result:/)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    // 6. Navigate to Quotes Comparison View
    await page.goto("/admin/quotes");
    await expect(page.getByText("Supplier Quotes Comparison")).toBeVisible();
    await expect(page.getByText("Quote #1")).toBeVisible();
    await expect(page.getByText("Price Slabs:").first()).toBeVisible();
  });
});
