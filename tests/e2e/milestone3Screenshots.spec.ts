import { test } from "@playwright/test";
import fs from "fs";

test.describe("Milestone 3 Screenshots", () => {
  test("capture admin cycle manager and live pooled tier ladder screens", async ({ page }) => {
    fs.mkdirSync("public/screenshots", { recursive: true });

    // 1. Login as Platform Admin
    await page.goto("/login");
    await page.getByText("Platform Admin").click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/admin", { timeout: 10000 });

    // 2. Admin Cycles Manager
    await page.goto("/admin/cycles");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/admin-cycles.png", fullPage: true });

    // 3. Inspect Live Cycle Pool & Slabs Detail
    const inspectBtn = page.getByRole("link", { name: /Live Pool/i }).first();
    await inspectBtn.click();
    await page.waitForURL("**/admin/cycles/*", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/admin-cycle-pool-detail.png", fullPage: true });
  });
});

