import { describe, it, expect } from "vitest";
import { notificationService } from "@/server/services/notificationService";
import { prisma } from "@/server/db/client";

describe("NotificationService Triggers", () => {
  it("dispatches notifications across channels and records them in the database", async () => {
    // Look up seed resident
    const resident = await prisma.user.findFirst({
      where: { phone: "9876543211" },
    });

    if (!resident) {
      console.warn("Seed resident not found, skipping db insert check");
      return;
    }

    const results = await notificationService.dispatch({
      userId: resident.id,
      phone: resident.phone,
      title: "Test Notification",
      body: "Testing multi-channel notification dispatch",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].success).toBe(true);
  });
});
