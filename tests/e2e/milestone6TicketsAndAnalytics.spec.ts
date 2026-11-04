import { test, expect } from "@playwright/test";
import { prisma } from "@/server/db/client";

test.describe("Milestone 6: Tickets with 48h SLA, Notifications, Retail Savings, and Analytics", () => {
  test("resident notifications & ticket submission -> admin 48h SLA ack & refund -> platform & society analytics", async ({
    page,
  }) => {
    // -------------------------------------------------------------
    // Step 1: Resident 1 logs in and checks Notification Centre
    // -------------------------------------------------------------
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543211"); // Resident 1
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/", { timeout: 10000 });

    // Open Notification Centre
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: /Notifications/i })).toBeVisible();

    // Verify notifications appear for multiple triggers in the seed scenario
    await expect(page.getByText(/Monthly Pool Open/i).first()).toBeVisible();
    await expect(page.getByText(/Tier 2 Unlocked/i).first()).toBeVisible();
    await expect(page.getByText(/24 Hours Left/i).first()).toBeVisible();
    await expect(page.getByText(/Payment Received/i).first()).toBeVisible();
    await expect(page.getByText(/Truck Arrived/i).first()).toBeVisible();
    await expect(page.getByText(/Ready for Pickup/i).first()).toBeVisible();
    await expect(page.getByText(/Support Ticket Update/i).first()).toBeVisible();

    // Verify channel badges appear
    await expect(page.getByText(/WhatsApp/i).first()).toBeVisible();
    await expect(page.getByText(/In-App/i).first()).toBeVisible();

    // Test Unread tab and Mark All Read
    await page.getByRole("button", { name: /Unread/i }).click();
    const markAllBtn = page.getByRole("button", { name: /Mark all read/i });
    if (await markAllBtn.isVisible()) {
      await markAllBtn.click();
      await expect(page.getByText(/You're all caught up!/i)).toBeVisible();
    }

    // -------------------------------------------------------------
    // Step 2: Resident checks savings vs nearby retail
    // -------------------------------------------------------------
    await page.goto("/savings");
    await expect(page.getByText(/You saved.*versus nearby retail/i)).toBeVisible();
    await expect(page.getByText(/Verified Savings/i)).toBeVisible();
    await expect(page.getByText(/Total Money Saved vs MRP/i)).toBeVisible();

    // -------------------------------------------------------------
    // Step 3: Resident raises an issue on their handed-over order
    // -------------------------------------------------------------
    const octOrder = await prisma.order.findFirst({
      where: { user: { phone: "9876543211" }, status: "HANDED_OVER" },
    });
    if (!octOrder) throw new Error("October order for resident not found");

    await page.goto(`/orders/${octOrder.id}`);
    await expect(page.getByRole("link", { name: /Need Help\? Raise an Issue/i })).toBeVisible();

    // Click "Need Help? Raise an Issue"
    await page.getByRole("link", { name: /Need Help\? Raise an Issue/i }).click();
    await page.waitForURL(`**/tickets/new?orderId=${octOrder.id}`);

    // Verify SLA commitment notice
    await expect(page.getByText(/48-Hour SLA Guarantee/i)).toBeVisible();

    // Fill the issue form
    const ticketSubject = `Torn oil pouch seal ${Date.now()}`;
    await page.locator("select").first().selectOption("DAMAGED_PACK");
    await page.getByPlaceholder(/e.g. Broken oil can seal/i).fill(ticketSubject);
    await page.getByPlaceholder(/Please provide details/i).fill(
      "The outer oil pouch was leaking upon collection at the clubhouse."
    );

    // Add demo photo attachment
    await page.getByRole("button", { name: /\+Broken Seal/i }).click();

    // Submit issue
    await page.getByRole("button", { name: /Submit Issue to Grievance Officer/i }).click();

    // Verify redirected to ticket detail with 48h SLA badge
    await page.waitForURL("**/tickets/*", { timeout: 10000 });
    await expect(page.getByText(/48-Hour SLA Acknowledgement Window/i)).toBeVisible();
    await expect(page.getByText("Open (Pending 48h SLA)").first()).toBeVisible();

    // Extract created ticket ID from URL
    const ticketUrl = page.url();
    const ticketId = ticketUrl.split("/tickets/")[1].split("?")[0];

    // -------------------------------------------------------------
    // Step 4: Platform Admin acknowledges and resolves ticket with refund
    // -------------------------------------------------------------
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543200"); // Platform Admin
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/admin", { timeout: 10000 });

    // Open Grievance Console
    await page.goto("/admin/tickets");
    await expect(page.getByRole("heading", { name: /Grievance Officer Console/i })).toBeVisible();
    await expect(page.getByText(/Pending 48h Ack/i)).toBeVisible();
    await expect(page.getByText(ticketSubject).first()).toBeVisible();

    // Open the ticket
    await page.goto(`/admin/tickets/${ticketId}`);
    await expect(page.getByText(ticketSubject).first()).toBeVisible();

    // Acknowledge ticket (48h SLA action)
    await page.getByRole("button", { name: /Acknowledge \(Stop 48h SLA\)/i }).click();
    await expect(page.getByText("Status: ACKNOWLEDGED")).toBeVisible({
      timeout: 5000,
    });

    // Send reply message
    await page.getByPlaceholder(/Reply to resident/i).fill("Investigating packaging issue with warehouse captain.");
    await page.locator("form").filter({ has: page.getByPlaceholder(/Reply to resident/i) }).getByRole("button").click();
    await expect(page.getByText("Investigating packaging issue with warehouse captain.")).toBeVisible({
      timeout: 5000,
    });

    // Resolve ticket with refund
    await page.getByRole("button", { name: /Resolve with Refund/i }).click();
    await page.getByPlaceholder(/Broken seal verified against photo/i).fill("Full apology refund of ₹150 approved.");
    await page.getByPlaceholder("e.g. 150").fill("150");
    await page.getByRole("button", { name: /Confirm & Resolve/i }).click();

    // Verify ticket status transitions to RESOLVED
    await expect(page.getByText("RESOLVED").first()).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------
    // Step 5: Platform Admin verifies Analytics match seed data
    // -------------------------------------------------------------
    await page.goto("/admin/analytics");
    await expect(page.getByRole("heading", { name: /Platform Analytics & GMV Dashboard/i })).toBeVisible();

    // KPI Cards
    await expect(page.getByText(/Pooled GMV/i)).toBeVisible();
    await expect(page.getByText(/Participation/i).first()).toBeVisible();
    await expect(page.getByText(/Resident Savings/i).first()).toBeVisible();
    await expect(page.getByText(/Supplier Fill Rate/i).first()).toBeVisible();
    await expect(page.getByText(/Refund Rate/i).first()).toBeVisible();

    // Verify Contribution per Society table
    await expect(page.getByText("Green Glen Heights").first()).toBeVisible();
    await expect(page.getByText("GGH100").first()).toBeVisible();

    // Verify Supplier Performance table
    await expect(page.getByText("Apex Agro Wholesale")).toBeVisible();
    await expect(page.getByText("Metro Bulk Essentials")).toBeVisible();

    // -------------------------------------------------------------
    // Step 6: Society Admin (RWA Committee) verifies dashboard & community rebate
    // -------------------------------------------------------------
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").fill("9876543299"); // Ramesh Gupta (Society Admin)
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await page.getByRole("button", { name: /Verify & Login/i }).click();
    await page.waitForURL("**/society-admin", { timeout: 10000 });

    // Verify Society Admin RWA Portal
    await expect(page.getByRole("heading", { name: /RWA Society Dashboard: Green Glen Heights/i })).toBeVisible();
    await expect(page.getByText(/2% Platform Development Rebate/i)).toBeVisible();
    await expect(page.getByText(/Total Community Rebate Earned/i)).toBeVisible();
    await expect(page.getByText(/GGH100/i)).toBeVisible();

    // Verify cycles breakdown lists October and November
    await expect(page.getByText("October 2026 Monthly Staples Pool")).toBeVisible();
    await expect(page.getByText("November 2026 Monthly Staples Pool")).toBeVisible();
  });
});
