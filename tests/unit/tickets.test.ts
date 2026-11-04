import { describe, it, expect } from "vitest";
import { computeTicketSla, isOrderEligibleForTicket } from "@/server/domain/tickets";

describe("Ticket Domain Logic", () => {
  describe("computeTicketSla", () => {
    it("computes active 48-hour countdown correctly", () => {
      const createdAt = new Date("2026-11-04T10:00:00Z");
      const now = new Date("2026-11-04T16:00:00Z"); // 6 hours later

      const sla = computeTicketSla(createdAt, null, null, now);
      expect(sla.isAcknowledged).toBe(false);
      expect(sla.isAcknowledgementBreached).toBe(false);
      expect(sla.acknowledgementRemainingHours).toBe(42);
      expect(sla.resolutionRemainingDays).toBe(30);
      expect(sla.isResolutionBreached).toBe(false);
    });

    it("detects breached 48-hour SLA when not acknowledged in time", () => {
      const createdAt = new Date("2026-11-01T10:00:00Z");
      const now = new Date("2026-11-03T12:00:00Z"); // 50 hours later

      const sla = computeTicketSla(createdAt, null, null, now);
      expect(sla.isAcknowledged).toBe(false);
      expect(sla.isAcknowledgementBreached).toBe(true);
      expect(sla.acknowledgementRemainingHours).toBe(0);
    });

    it("freezes acknowledgement SLA when acknowledged", () => {
      const createdAt = new Date("2026-11-01T10:00:00Z");
      const ackAt = new Date("2026-11-01T14:00:00Z"); // 4 hours later
      const now = new Date("2026-11-05T10:00:00Z"); // days later

      const sla = computeTicketSla(createdAt, ackAt, null, now);
      expect(sla.isAcknowledged).toBe(true);
      expect(sla.isAcknowledgementBreached).toBe(false); // acknowledged in time
    });

    it("detects breached 30-day resolution target", () => {
      const createdAt = new Date("2026-09-01T10:00:00Z");
      const ackAt = new Date("2026-09-01T14:00:00Z");
      const now = new Date("2026-10-15T10:00:00Z"); // 44 days later

      const sla = computeTicketSla(createdAt, ackAt, null, now);
      expect(sla.isAcknowledged).toBe(true);
      expect(sla.isAcknowledgementBreached).toBe(false);
      expect(sla.isResolved).toBe(false);
      expect(sla.isResolutionBreached).toBe(true);
    });
  });

  describe("isOrderEligibleForTicket", () => {
    it("allows issue within 24 hours of goods handover", () => {
      const handedOverAt = new Date("2026-11-04T12:00:00Z");
      const now = new Date("2026-11-04T18:00:00Z"); // 6 hours later

      const result = isOrderEligibleForTicket("HANDED_OVER", handedOverAt, now);
      expect(result.eligible).toBe(true);
    });

    it("blocks issue when > 24 hours elapsed since handover", () => {
      const handedOverAt = new Date("2026-11-01T12:00:00Z");
      const now = new Date("2026-11-02T16:00:00Z"); // 28 hours later

      const result = isOrderEligibleForTicket("HANDED_OVER", handedOverAt, now);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("Reporting window expired");
    });

    it("blocks issue for cancelled orders", () => {
      const result = isOrderEligibleForTicket("CANCELLED", null);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("cancelled order");
    });
  });
});
