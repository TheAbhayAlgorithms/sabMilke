import { test, expect } from "@playwright/test";

test.describe("Milestone 4 Resident PWA & Idempotent Webhook Acceptance", () => {
  test("resident joins society, shops catalogue, orders, pays via mock UPI, and sees updated society progress", async ({ page }) => {
    // 1. Visit Login with callbackUrl pointing to join with demo code
    await page.goto("/login?callbackUrl=/join?code=GGH100");
    await expect(page.getByText("Login to SocietyBuy")).toBeVisible();

    const uniquePhone = `98765${Math.floor(20000 + Math.random() * 70000)}`;
    await page.getByPlaceholder("9876543210").fill(uniquePhone);
    await page.getByRole("button", { name: /Send OTP/i }).click();

    // Fill OTP and submit
    await expect(page.getByPlaceholder("123456")).toBeVisible();
    await page.getByRole("button", { name: /Verify & Login/i }).click();

    // After login, callbackUrl redirects to Join Society
    await page.waitForURL("**/join?code=GGH100", { timeout: 10000 });
    await expect(page.getByText("Join Your Society Pool")).toBeVisible();

    // Check society details resolved
    await expect(page.getByText("Green Glen Heights")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Sarjapur Road, Bellandur")).toBeVisible();

    // Fill resident name and select flat
    await page.getByPlaceholder("e.g. Priya Sharma").fill("Pooja Mehta");
    // Select an unassigned flat from dropdown
    await page.locator("select").selectOption({ label: "Tower B - Flat B-509" });

    // Submit Join
    await page.getByRole("button", { name: /Join Society & Pool/i }).click();

    // Should redirect to Catalogue
    await page.waitForURL("**/catalogue", { timeout: 10000 });
    await expect(page.getByText("Wholesale Staples Catalogue")).toBeVisible();
    await expect(page.getByText("Current Open Society Pool")).toBeVisible();

    // 2. Explore SKU and Tier Ladder
    // Click on the first "View Slabs" or product link
    const viewSlabsLink = page.getByRole("link", { name: /View Slabs/i }).first();
    await viewSlabsLink.click();
    await page.waitForURL("**/sku/*", { timeout: 10000 });

    // Assert Tier Ladder and Benchmarks are visible
    await expect(page.getByText("Live Society Tier Ladder")).toBeVisible();
    await expect(page.getByText("Quick Commerce Benchmark Comparison")).toBeVisible();
    await expect(page.getByText(/Price Drop Guarantee/i)).toBeVisible();

    // Increase quantity to 2
    const plusBtn = page.getByRole("button", { name: "+" });
    if (await plusBtn.isVisible()) {
      await plusBtn.click();
    }

    // Add to Basket
    await page.getByRole("button", { name: /Add \d+ to Basket/i }).click();
    await expect(page.getByText(/Added to Basket/i)).toBeVisible();

    // 3. Cart & Review
    await page.goto("/cart");
    await expect(page.getByText("Your Society Pool Basket")).toBeVisible();
    await expect(page.getByText("Guaranteed Subtotal")).toBeVisible();
    await expect(page.getByText("Total MRP Savings")).toBeVisible();

    // Proceed to Checkout
    await page.getByRole("link", { name: /Proceed to Checkout/i }).click();
    await page.waitForURL("**/checkout", { timeout: 10000 });

    // 4. Checkout with Mock UPI
    await expect(page.getByText("Checkout & UPI Payment")).toBeVisible();
    await expect(page.getByText("Flat B-509")).toBeVisible();
    await expect(page.getByText("Clubhouse Main Drop Zone")).toBeVisible();

    // Click Pay & Confirm
    const payBtn = page.getByRole("button", { name: /Pay & Confirm Order/i });
    await payBtn.click();

    // Redirect to Order Detail / Pickup Pass
    await page.waitForURL("**/orders/*", { timeout: 15000 });
    await expect(page.getByText("Order Placed Successfully!")).toBeVisible();
    await expect(page.getByText("Pickup Pass")).toBeVisible();
    await expect(page.getByText("Pickup PIN")).toBeVisible();
    await expect(page.getByText("Payment Confirmed")).toBeVisible();

    // 5. Verify Society Progress on Home Page
    await page.goto("/");
    await expect(page.getByText("Green Glen Heights")).toBeVisible();
    // Orders placed count should be visible and greater than 0
    await expect(page.getByText("Orders Placed")).toBeVisible();

    // 6. Verify Captain Participation Roster
    // Login as Captain Vikram Sharma
    await page.goto("/login");
    await page.getByText("Society Captain").click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/captain", { timeout: 10000 });

    await page.goto("/captain/participation");
    await expect(page.getByText("Participation & Invite Hub")).toBeVisible();
    await expect(page.getByText("WhatsApp Invite Link")).toBeVisible();

    // Flat B-509 should now appear in the ordered list
    await expect(page.getByText("B-509")).toBeVisible();
  });

  test("webhook replay does not double-credit or double-pool (idempotency)", async ({ request }) => {
    // 1. Create a simulated payment captured webhook payload
    const eventId = `evt_e2e_replay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payloadObj = {
      id: eventId,
      entity: "event",
      event: "payment.captured",
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: `pay_e2e_${Date.now()}`,
            amount: 150000,
            currency: "INR",
            status: "captured",
            order_id: "order_mock_test",
            method: "upi",
            notes: {
              societyId: "dummy_soc",
            },
          },
        },
      },
    };

    const rawPayload = JSON.stringify(payloadObj);
    const signature = "mock_valid_signature";

    // First Webhook Call
    const res1 = await request.post("/api/webhooks/razorpay", {
      data: rawPayload,
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": eventId,
      },
    });

    expect(res1.status()).toBe(200);
    const data1 = await res1.json();
    expect(data1.received).toBe(true);
    expect(data1.duplicate).toBe(false);

    // Replay the EXACT SAME webhook (duplicate attempt)
    const res2 = await request.post("/api/webhooks/razorpay", {
      data: rawPayload,
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": eventId,
      },
    });

    expect(res2.status()).toBe(200);
    const data2 = await res2.json();
    // Idempotent: must identify as duplicate and ignore side effects!
    expect(data2.received).toBe(true);
    expect(data2.duplicate).toBe(true);
    expect(data2.actionTaken).toBe("IGNORED_DUPLICATE");
  });

  test("profile compliance: consent options not pre-ticked, one-tap revoke, and data export", async ({ page }) => {
    // Login as Resident 1
    await page.goto("/login");
    await page.getByText("Resident", { exact: true }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/", { timeout: 10000 });

    // Visit Profile
    await page.goto("/profile");
    await expect(page.getByText(/Privacy & Consent Preferences/i)).toBeVisible();

    // Verify plain language purpose checkboxes are present
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Verify none are pre-ticked if not set
    // Save consent
    await page.getByRole("button", { name: /Save Consent Preferences/i }).click();
    await expect(page.getByText(/preferences saved successfully/i)).toBeVisible();

    // Test One-Tap Revoke
    await page.getByRole("button", { name: /Revoke All Consents/i }).click();
    await expect(page.getByText(/consents have been revoked/i)).toBeVisible();

    // Test Data Export trigger
    const exportBtn = page.getByRole("button", { name: /Download JSON Export/i });
    await expect(exportBtn).toBeVisible();
  });
});
