import { describe, it, expect } from "vitest";
import { recordAuditLog } from "@/server/services/auditService";
import { prisma } from "@/server/db/client";

describe("Audit Logging Service (Rule 2)", () => {
  it("records an audit log with actor, action, entity, before, after, timestamp", async () => {
    const log = await recordAuditLog({
      action: "CYCLE_OPENED",
      entity: "Cycle",
      entityId: "test-cycle-123",
      before: { status: "DRAFT" },
      after: { status: "OPEN" },
      ipAddress: "127.0.0.1",
    });

    expect(log.id).toBeDefined();
    expect(log.action).toBe("CYCLE_OPENED");
    expect(log.entity).toBe("Cycle");
    expect(log.entityId).toBe("test-cycle-123");
    expect(log.before).toEqual({ status: "DRAFT" });
    expect(log.after).toEqual({ status: "OPEN" });
    expect(log.createdAt).toBeInstanceOf(Date);

    // Verify it is persisted in the database
    const saved = await prisma.auditLog.findUnique({ where: { id: log.id } });
    expect(saved).not.toBeNull();
    expect(saved?.action).toBe("CYCLE_OPENED");
  });
});

