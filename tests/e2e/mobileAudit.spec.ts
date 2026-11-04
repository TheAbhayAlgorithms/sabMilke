import { test, expect } from "@playwright/test";

test.describe("Mobile-First PWA & Accessibility Audit (Milestone 7)", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("PWA manifest, theme color, and viewport metadata are present and valid", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    // Viewport meta tag check
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveAttribute(
      "content",
      /width=device-width/i
    );

    // Theme color meta tag check
    const themeColorMeta = page.locator('meta[name="theme-color"]');
    await expect(themeColorMeta).toHaveAttribute("content", "#16a34a");

    // Manifest link tag check
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.json");

    // Direct HTTP check of manifest.json
    const manifestResponse = await request.get("/manifest.json");
    expect(manifestResponse.ok()).toBeTruthy();
    const manifestJson = await manifestResponse.json();
    expect(manifestJson.name).toContain("SocietyBuy");
    expect(manifestJson.display).toBe("standalone");
    expect(manifestJson.theme_color).toBe("#16a34a");
  });

  test("360px mobile viewport renders without horizontal overflow on key screens", async ({
    page,
  }) => {
    const testPaths = ["/", "/login", "/how-it-works", "/faq"];

    for (const path of testPaths) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");

      // Verify no horizontal scrolling exists (scrollWidth should not exceed clientWidth)
      const hasOverflow = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        return scrollWidth > docWidth;
      });

      expect(
        hasOverflow,
        `Page at ${path} has unexpected horizontal overflow at 360px viewport`
      ).toBe(false);
    }
  });

  test("Touch targets on primary actions meet mobile ergonomic guidelines (>= 44px)", async ({
    page,
  }) => {
    await page.goto("/login");

    const submitBtn = page.getByRole("button", { name: /send otp/i });
    await expect(submitBtn).toBeVisible();

    const box = await submitBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(
        box.height,
        "Login button height should be at least 44px for easy thumb tapping"
      ).toBeGreaterThanOrEqual(44);
    }
  });

  test("Custom 404 page renders for nonexistent routes with helpful navigation", async ({
    page,
  }) => {
    await page.goto("/random-non-existent-route-for-testing");
    await expect(page.getByText("Page Not Found")).toBeVisible();
    await expect(page.getByText("पृष्ठ नहीं मिला (404)")).toBeVisible();

    // Verify navigation options are clickable
    const homeBtn = page.getByRole("link", { name: "Home (होम)" });
    await expect(homeBtn).toBeVisible();
    await homeBtn.click();
    await expect(page).toHaveURL("/");
  });
});
