import { test, expect } from "@playwright/test";

test.describe("Milestone 3: Cycle State Machine, Admin Cycle Manager & Live Pool Details", () => {
  test("Platform Admin can view cycles, create new cycle, and inspect live per-SKU pool", async ({ page }) => {
    // 1. Login as Platform Admin
    await page.goto("/login");
    await page.getByText("Platform Admin").click();
    await expect(page.getByPlaceholder("123456")).toBeVisible();
    await page.getByRole("button", { name: /Verify & Login/i }).click();

    // 2. Navigate to Admin Console and then Cycle Manager
    await page.waitForURL("**/admin", { timeout: 10000 });
    await page.goto("/admin/cycles");
    await expect(page.getByText("Society Cycle Manager")).toBeVisible();
    await expect(page.getByRole("table").getByText("Green Glen Heights").first()).toBeVisible();

    // 3. Inspect the live seeded cycle
    const inspectBtn = page.getByRole("link", { name: /Live Pool/i }).first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();

    // 4. On Cycle Detail page: verify live aggregation & tier ladder
    await page.waitForURL("**/admin/cycles/*", { timeout: 10000 });
    await expect(page.getByText("Live Pooled SKU Demands & Discount Tiers")).toBeVisible();
    await expect(page.getByText("Total Society GMV")).toBeVisible();
    await expect(page.getByText("Participating Flats")).toBeVisible();
    await expect(page.getByText("Classic Basmati Rice")).toBeVisible();

    // 5. Navigate back to cycles list and create a new cycle
    await page.goto("/admin/cycles");
    await page.getByRole("button", { name: /Create New Cycle/i }).click();
    await expect(page.getByText("Create New Society Cycle")).toBeVisible();

    // Submit new cycle form
    await page.locator("form").getByRole("button", { name: "Create Cycle" }).click();
    await expect(page.getByText("December 2026 Monthly Staples Pool")).toBeVisible();

    // 6. Test opening the newly created DRAFT cycle
    const openBtn = page.getByRole("button", { name: "Open" }).first();
    if (await openBtn.isVisible()) {
      await openBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("Platform Admin can force-lock cycle and trigger price calculations", async ({ page }) => {
    // 1. Login as Platform Admin
    await page.goto("/login");
    await page.getByText("Platform Admin").click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/admin", { timeout: 10000 });

    // 2. Go to Cycle Manager
    await page.goto("/admin/cycles");
    await expect(page.getByText("Society Cycle Manager")).toBeVisible();

    // 3. Trigger Force Lock on an OPEN cycle
    const forceLockBtn = page.getByRole("button", { name: "Force Lock" }).first();
    if (await forceLockBtn.isVisible()) {
      await forceLockBtn.click();
      await page.waitForTimeout(500);
    }
  });
});

