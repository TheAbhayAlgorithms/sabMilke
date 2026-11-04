import { test } from "@playwright/test";
import fs from "fs";

test.describe("Milestone 1 Screenshot Generation", () => {
  test("capture mobile viewport screens", async ({ page }) => {
    fs.mkdirSync("public/screenshots", { recursive: true });

    // 1. Home English
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/home-en.png", fullPage: true });

    // 2. Home Hindi
    await page.getByRole("button", { name: "Switch to Hindi" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "public/screenshots/home-hi.png", fullPage: true });

    // 3. Login page
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/login-seed-users.png", fullPage: true });

    // 4. Catalogue page
    await page.goto("/catalogue");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/screenshots/catalogue.png", fullPage: true });
  });
});

