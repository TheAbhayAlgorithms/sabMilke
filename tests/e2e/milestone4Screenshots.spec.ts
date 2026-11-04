import { test } from "@playwright/test";
import fs from "fs";

test.describe("Milestone 4 Screenshots", () => {
  test("capture resident PWA and captain screens on mobile", async ({ page }) => {
    fs.mkdirSync("public/screenshots", { recursive: true });

    // Set mobile-first viewport (360x740)
    await page.setViewportSize({ width: 360, height: 740 });

    // 1. Join Society Screen
    await page.goto("/login?callbackUrl=/join?code=GGH100");
    const testPhone = `98765${Math.floor(20000 + Math.random() * 70000)}`;
    await page.getByPlaceholder("9876543210").fill(testPhone);
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();

    await page.waitForURL("**/join?code=GGH100", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/resident-join.png", fullPage: true });

    // Join society to access member views
    await page.getByPlaceholder("e.g. Priya Sharma").fill("Aarav Mehta");
    await page.locator("select").selectOption({ label: "Tower B - Flat B-510" });
    await page.getByRole("button", { name: /Join Society & Pool/i }).click();
    await page.waitForURL("**/catalogue", { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // 2. Mobile Catalogue Screen
    await page.screenshot({ path: "public/screenshots/resident-catalogue-360.png", fullPage: true });

    // 3. SKU Detail & Tier Ladder Screen
    const viewSlabsLink = page.getByRole("link", { name: /View Slabs/i }).first();
    await viewSlabsLink.click();
    await page.waitForURL("**/sku/*", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/resident-sku-tier-ladder.png", fullPage: true });

    // Add to cart
    await page.getByRole("button", { name: /Add \d+ to Basket/i }).click();

    // 4. Cart Screen
    await page.goto("/cart");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/resident-cart.png", fullPage: true });

    // 5. Checkout Screen
    await page.goto("/checkout");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/resident-checkout.png", fullPage: true });

    // Complete order to capture pickup pass
    await page.getByRole("button", { name: /Pay & Confirm Order/i }).click();
    await page.waitForURL("**/orders/*", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // 6. Order Pickup Pass & QR Screen
    await page.screenshot({ path: "public/screenshots/resident-order-pickup-pass.png", fullPage: true });

    // 7. Wallet Screen
    await page.goto("/wallet");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/resident-wallet.png", fullPage: true });

    // 8. Savings Screen
    await page.goto("/savings");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/resident-savings.png", fullPage: true });

    // 9. Profile & DPDP Consent Screen
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/resident-profile-consent.png", fullPage: true });

    // 10. Captain Participation Hub Screen
    await page.goto("/login");
    await page.getByText("Society Captain").click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/captain", { timeout: 10000 });

    await page.goto("/captain/participation");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/captain-participation-roster.png", fullPage: true });
  });
});
