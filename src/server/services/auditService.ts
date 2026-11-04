import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";

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

  return db.auditLog.create({
    data: {
      societyId: params.societyId ?? null,
      actorId: params.actorId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      before: params.before ? (JSON.parse(JSON.stringify(params.before)) as Prisma.InputJsonValue) : Prisma.DbNull,
      after: params.after ? (JSON.parse(JSON.stringify(params.after)) as Prisma.InputJsonValue) : Prisma.DbNull,
      ipAddress: params.ipAddress ?? null,
    },
  });
}

