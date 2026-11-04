import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { prisma } from "@/server/db/client";
import { createOrder, getOrderDetails } from "@/server/services/orderService";
import { createTicket } from "@/server/services/ticketService";
import { getPerFlatPackingList } from "@/server/services/distributionService";
import {
  checkRateLimit,
  checkOtpSendRateLimit,
  checkOtpVerifyRateLimit,
  clearRateLimits,
} from "@/server/security/rateLimiter";
import { validateCsrf } from "@/server/security/csrf";
import {
  maskPhone,
  maskEmail,
  maskOtp,
  sanitizeAuditData,
} from "@/server/security/masking";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

describe("Milestone 7: Security & Cross-Society Isolation", () => {
  let societyAId: string;
  let societyBId: string;
  let cycleAId: string;
  let cycleBId: string;
  let flatAId: string;
  let flatBId: string;
  let userAId: string;
  let userBId: string;
  let skuId: string;
  let orderAId: string;

  beforeAll(async () => {
    // 1. Fetch seed societies
    const societyA = await prisma.society.findUnique({
      where: { joinCode: "GGH100" },
      include: {
        cycles: { where: { status: "OPEN" }, include: { cycleSkus: true } },
        flats: true,
      },
    });
    if (!societyA) throw new Error("Seed society A (GGH100) not found");
    societyAId = societyA.id;
    cycleAId = societyA.cycles[0].id;
    flatAId = societyA.flats[0].id;
    skuId = societyA.cycles[0].cycleSkus[0].skuId;

    // Find a valid seeded order in Society A
    const orderA = await prisma.order.findFirst({
      where: { societyId: societyAId },
    });
    if (!orderA) throw new Error("Seed order in Society A not found");
    orderAId = orderA.id;
    userAId = orderA.userId;

    // 2. Create second isolated society B for cross-society boundary testing
    let societyB = await prisma.society.findUnique({
      where: { joinCode: "SS2001" },
    });
    if (!societyB) {
      societyB = await prisma.society.create({
        data: {
          name: "Silver Springs Society",
          slug: "silver-springs",
          addressLine: "Sector 50, Gurugram, Haryana",
          city: "Gurugram",
          state: "Haryana",
          pincode: "122018",
          joinCode: "SS2001",
        },
      });
    }
    societyBId = societyB.id;

    // Create a flat in society B
    let flatB = await prisma.flat.findFirst({
      where: { societyId: societyBId, flatNumber: "B-101" },
    });
    if (!flatB) {
      flatB = await prisma.flat.create({
        data: {
          societyId: societyBId,
          flatNumber: "B-101",
          tower: "Tower B",
        },
      });
    }
    flatBId = flatB.id;

    // Create User B in society B
    let residentB = await prisma.user.findUnique({
      where: { phone: "9811122299" },
    });
    if (!residentB) {
      residentB = await prisma.user.create({
        data: {
          phone: "9811122299",
          name: "Silver Springs Resident",
          memberships: {
            create: {
              societyId: societyBId,
              flatId: flatBId,
              role: Role.RESIDENT,
            },
          },
        },
      });
    }
    userBId = residentB.id;

    // Create an open cycle for Society B
    let cycleB = await prisma.cycle.findFirst({
      where: { societyId: societyBId, name: "Silver Springs Cycle Nov 2026" },
    });
    if (!cycleB) {
      cycleB = await prisma.cycle.create({
        data: {
          societyId: societyBId,
          name: "Silver Springs Cycle Nov 2026",
          status: "OPEN",
          opensAt: new Date(),
          locksAt: new Date(Date.now() + 86400000),
          deliveryTargetDate: new Date(Date.now() + 172800000),
          minSocietyValuePaise: 500000,
          minHouseholds: 5,
          cycleSkus: {
            create: {
              skuId,
              guaranteedPricePaise: 38000,
              finalPricePaise: 38000,
            },
          },
        },
      });
    }
    cycleBId = cycleB.id;

  });

  beforeEach(() => {
    clearRateLimits();
  });

  describe("Cross-Society Isolation (Rule 5)", () => {
    it("prevents ordering in Society B cycle when societyId is specified as Society A", async () => {
      await expect(
        createOrder(userAId, {
          societyId: societyAId,
          cycleId: cycleBId, // Cycle belongs to Society B!
          flatId: flatAId,
          items: [{ skuId, quantity: 2 }],
        })
      ).rejects.toThrow("Cycle does not belong to the selected society.");
    });

    it("prevents ordering for a flat that does not belong to the cycle's society", async () => {
      await expect(
        createOrder(userAId, {
          societyId: societyBId,
          cycleId: cycleBId,
          flatId: flatAId, // Flat belongs to Society A, not Society B!
          items: [{ skuId, quantity: 2 }],
        })
      ).rejects.toThrow("Flat not found in this society.");
    });

    it("prevents user B from reading user A's private order details", async () => {
      await expect(getOrderDetails(userBId, orderAId)).rejects.toThrow(
        "You do not have permission to view this order."
      );
    });

    it("prevents resident from raising a ticket on an order belonging to another resident", async () => {
      await expect(
        createTicket({
          userId: userBId, // User B trying to complain on User A's order
          orderId: orderAId,
          category: "DAMAGED_PACK",
          subject: "Malicious cross-user ticket attempt",
          description: "Trying to raise an issue on someone else's order",
        })
      ).rejects.toThrow("You can only raise issues for your own orders.");
    });

    it("scoping packing list by mismatched societyId throws an error", async () => {
      // Trying to request Society A's cycle using Society B's id
      await expect(getPerFlatPackingList(cycleAId, societyBId)).rejects.toThrow(
        "Cycle not found or access denied for this society."
      );
    });
  });

  describe("Rate Limiting", () => {
    it("enforces sliding window limits and rejects on limit exceeded", () => {
      const ip = "192.168.1.100";
      // 5 requests within window of 5
      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit(ip, 5, 60000);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(4 - i);
      }

      // 6th request must be blocked
      const blocked = checkRateLimit(ip, 5, 60000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("enforces OTP send rate limiting (max 5 per minute per phone)", () => {
      const phone = "9876543210";
      for (let i = 0; i < 5; i++) {
        const res = checkOtpSendRateLimit(phone);
        expect(res.allowed).toBe(true);
      }

      const blocked = checkOtpSendRateLimit(phone);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("enforces OTP verify rate limiting (max 5 attempts per minute per phone)", () => {
      const phone = "9876543210";
      for (let i = 0; i < 5; i++) {
        const res = checkOtpVerifyRateLimit(phone);
        expect(res.allowed).toBe(true);
      }

      const blocked = checkOtpVerifyRateLimit(phone);
      expect(blocked.allowed).toBe(false);
    });

    it("clearing rate limits resets counters", () => {
      const phone = "9876543210";
      for (let i = 0; i < 5; i++) {
        checkOtpSendRateLimit(phone);
      }
      expect(checkOtpSendRateLimit(phone).allowed).toBe(false);

      clearRateLimits();
      expect(checkOtpSendRateLimit(phone).allowed).toBe(true);
    });
  });

  describe("CSRF Protection", () => {
    it("allows GET requests without CSRF checks", () => {
      const req = new NextRequest("http://localhost:3000/api/society/join", {
        method: "GET",
      });
      const result = validateCsrf(req);
      expect(result.valid).toBe(true);
    });

    it("allows webhook requests to bypass CSRF", () => {
      const req = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": "dummy-signature",
          origin: "https://api.razorpay.com",
        },
      });
      const result = validateCsrf(req);
      expect(result.valid).toBe(true);
    });

    it("blocks cross-origin POST request with mismatched origin", () => {
      const req = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://malicious-site.com",
        },
      });
      const result = validateCsrf(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("CSRF check failed");
    });

    it("allows POST request when origin matches host", () => {
      const req = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      });
      const result = validateCsrf(req);
      expect(result.valid).toBe(true);
    });
  });

  describe("Secrets Redaction & Masking", () => {
    it("masks phone numbers correctly", () => {
      expect(maskPhone("9876543210")).toBe("98******10");
      expect(maskPhone("+919876543210")).toBe("+9******10");
      expect(maskPhone("123")).toBe("******");
    });

    it("masks email addresses correctly", () => {
      expect(maskEmail("john.doe@example.com")).toBe("j***e@example.com");
      expect(maskEmail("a@b.com")).toBe("*@b.com");
    });

    it("masks OTP codes", () => {
      expect(maskOtp("123456")).toBe("******");
      expect(maskOtp("8842")).toBe("******");
    });

    it("recursively sanitizes audit log payloads by redacting sensitive keys", () => {
      const sensitiveData = {
        userId: "user-123",
        role: "RESIDENT",
        password: "super-secret-password",
        token: "jwt-token-xyz",
        otp: "123456",
        paymentDetails: {
          apiKey: "rzp_test_12345678",
          secret: "hidden-key",
          authHeader: "Bearer abcdef",
          amountPaise: 45000,
        },
        items: [
          { skuId: "sku-1", quantity: 2 },
          { cookie: "session=xyz", note: "Clean note" },
        ],
      };

      const sanitized = sanitizeAuditData(sensitiveData) as any;

      expect(sanitized.userId).toBe("user-123");
      expect(sanitized.role).toBe("RESIDENT");
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.token).toBe("[REDACTED]");
      expect(sanitized.otp).toBe("[REDACTED]");
      expect(sanitized.paymentDetails.apiKey).toBe("[REDACTED]");
      expect(sanitized.paymentDetails.secret).toBe("[REDACTED]");
      expect(sanitized.paymentDetails.authHeader).toBe("[REDACTED]");
      expect(sanitized.paymentDetails.amountPaise).toBe(45000);
      expect(sanitized.items[0]).toEqual({ skuId: "sku-1", quantity: 2 });
      expect(sanitized.items[1].cookie).toBe("[REDACTED]");
      expect(sanitized.items[1].note).toBe("Clean note");
    });
  });
});
