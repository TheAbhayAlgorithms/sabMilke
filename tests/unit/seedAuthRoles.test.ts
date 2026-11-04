import { describe, it, expect } from "vitest";
import { verifyOtpAndLogin } from "@/server/services/authService";
import { verifySessionToken } from "@/server/auth/session";
import { Role } from "@prisma/client";

describe("Seed Users Login & Role Verification (Milestone 1 Acceptance)", () => {
  it("authenticates Resident from seed data and produces valid session", async () => {
    const { token, session } = await verifyOtpAndLogin("9876543211", "123456");
    expect(token).toBeDefined();
    expect(session.phone).toBe("9876543211");
    expect(session.activeRole).toBe(Role.RESIDENT);
    expect(session.memberships.length).toBeGreaterThan(0);
    expect(session.memberships[0].role).toBe(Role.RESIDENT);

    const verified = await verifySessionToken(token);
    expect(verified?.userId).toBe(session.userId);
  });

  it("authenticates Captain from seed data and produces CAPTAIN role", async () => {
    const { token, session } = await verifyOtpAndLogin("9876543210", "123456");
    expect(token).toBeDefined();
    expect(session.phone).toBe("9876543210");
    expect(session.activeRole).toBe(Role.CAPTAIN);
    expect(session.name).toContain("Vikram Sharma");
    expect(session.memberships[0].role).toBe(Role.CAPTAIN);
  });

  it("authenticates Society Admin from seed data and produces SOCIETY_ADMIN role", async () => {
    const { token, session } = await verifyOtpAndLogin("9876543299", "123456");
    expect(token).toBeDefined();
    expect(session.phone).toBe("9876543299");
    expect(session.activeRole).toBe(Role.SOCIETY_ADMIN);
    expect(session.name).toContain("Ramesh Gupta");
  });

  it("authenticates Supplier from seed data and produces SUPPLIER role with supplierId", async () => {
    const { token, session } = await verifyOtpAndLogin("9876543301", "123456");
    expect(token).toBeDefined();
    expect(session.phone).toBe("9876543301");
    expect(session.activeRole).toBe("SUPPLIER");
    expect(session.supplierId).toBeDefined();
  });

  it("authenticates Platform Admin from seed data and produces PLATFORM_ADMIN role", async () => {
    const { token, session } = await verifyOtpAndLogin("9876543200", "123456");
    expect(token).toBeDefined();
    expect(session.phone).toBe("9876543200");
    expect(session.activeRole).toBe(Role.PLATFORM_ADMIN);
    expect(session.name).toContain("Ananya Roy");
  });

  it("rejects invalid OTP", async () => {
    await expect(verifyOtpAndLogin("9876543211", "000000")).rejects.toThrow("Invalid or expired OTP");
  });
});
