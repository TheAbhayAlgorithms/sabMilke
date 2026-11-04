import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { sanitizeAuditData } from "@/server/security/masking";

export interface CreateAuditLogParams {
  societyId?: string | null;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}

/**
 * RULE 2: Every state change on cycles, orders, payments, purchase orders
 * and deliveries writes a row to audit_logs (actor, action, entity, before, after, timestamp).
 */
export async function recordAuditLog(
  params: CreateAuditLogParams,
  tx?: Prisma.TransactionClient | PrismaClient
) {
  const db = tx ?? prisma;

  const sanitizedBefore = params.before ? sanitizeAuditData(params.before) : null;
  const sanitizedAfter = params.after ? sanitizeAuditData(params.after) : null;

  return db.auditLog.create({
    data: {
      societyId: params.societyId ?? null,
      actorId: params.actorId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      before: sanitizedBefore ? (JSON.parse(JSON.stringify(sanitizedBefore)) as Prisma.InputJsonValue) : Prisma.DbNull,
      after: sanitizedAfter ? (JSON.parse(JSON.stringify(sanitizedAfter)) as Prisma.InputJsonValue) : Prisma.DbNull,
      ipAddress: params.ipAddress ?? null,
    },
  });
}

