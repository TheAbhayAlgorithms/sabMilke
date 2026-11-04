import { test, expect } from "@playwright/test";

test.describe("Milestone 1 Authentication & Localization Smoke Tests", () => {
  test("User can view home page, toggle language, and login as Captain", async ({ page }) => {
    // 1. Visit landing page
    await page.goto("/");
    await expect(page).toHaveTitle(/SocietyBuy/);

    // 2. Test Language Toggle (English -> Hindi -> English)
    const hindiBtn = page.getByRole("button", { name: "Switch to Hindi" });
    await hindiBtn.click();
    await expect(page.getByText("मासिक राशन ऑर्डर करें")).toBeVisible();

    const englishBtn = page.getByRole("button", { name: "Switch to English" });
    await englishBtn.click();
    await expect(page.getByText("Order Monthly Staples")).toBeVisible();

    // 3. Visit login page
    await page.goto("/login");
    await expect(page.getByText("Login to SocietyBuy")).toBeVisible();

    // 4. Click Captain quick login
    const captainQuickLogin = page.getByText("Society Captain");
    await captainQuickLogin.click();

    // Verify phone is populated and OTP step is rendered
    await expect(page.getByPlaceholder("123456")).toBeVisible();

    // 5. Submit OTP
    await page.getByRole("button", { name: /Verify & Login/i }).click();

    // 6. Verify successful login redirect and session greeting
    await page.waitForURL("**/captain", { timeout: 10000 });
    // Or redirected
  });

  test("Resident can login via demo quick button", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Resident", { exact: true }).click();
    await expect(page.getByPlaceholder("123456")).toBeVisible();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/", { timeout: 10000 });
    await expect(page.getByText("Resident 1")).toBeVisible();
  });
});
