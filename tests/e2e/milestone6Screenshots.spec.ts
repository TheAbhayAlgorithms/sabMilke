import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { prisma } from "@/server/db/client";

const ARTIFACT_DIR = path.resolve(
  "/Users/abhayrajsingh/.gemini/antigravity/brain/bc3f5e72-60b2-42f4-96c5-77a683fb5d34/screenshots"
);

test.describe("Milestone 6 Screenshot Capture", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }
  });

  test("captures milestone 6 UI screens", async ({ page }) => {
    // 1. Resident Notifications
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543211"); // Resident 1
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/", { timeout: 10000 });

    await page.goto("/notifications");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "resident-notifications.png"), fullPage: true });

    // 2. Retail Savings
    await page.goto("/savings");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "resident-retail-savings.png"), fullPage: true });

    // 3. Resident Ticket Detail
    const openTicket = await prisma.ticket.findFirst({
      where: { user: { phone: "9876543211" } },
    });
    if (openTicket) {
      await page.goto(`/tickets/${openTicket.id}`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "resident-ticket-detail.png"), fullPage: true });
    }

    // 4. Platform Admin Grievance Console & Analytics
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543200"); // Platform Admin
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/admin", { timeout: 10000 });

    await page.goto("/admin/tickets");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "admin-grievance-console.png"), fullPage: true });

    if (openTicket) {
      await page.goto(`/admin/tickets/${openTicket.id}`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "admin-ticket-resolution.png"), fullPage: true });
    }

    await page.goto("/admin/analytics");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "admin-analytics-dashboard.png"), fullPage: true });

    await page.goto("/admin/benchmarks");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "admin-benchmarks.png"), fullPage: true });

    // 5. Society Admin RWA Portal
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543299"); // Society Admin
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/society-admin", { timeout: 10000 });

    await page.goto("/society-admin");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "society-admin-rebate-dashboard.png"), fullPage: true });
  });
});
