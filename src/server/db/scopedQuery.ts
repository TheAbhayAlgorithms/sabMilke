import { SessionPayload } from "@/server/auth/session";
import { requireSocietyAccess } from "@/server/auth/guards";
import { Role } from "@prisma/client";

/**
 * Ensures that any where-clause targeting society-scoped entities
 * strictly enforces the user's authorized societyId.
 */
export function buildSocietyScope(
  session: SessionPayload | null,
  targetSocietyId: string,
  allowedRoles?: Role[]
): { societyId: string } {
  requireSocietyAccess(session, targetSocietyId, allowedRoles);
  return { societyId: targetSocietyId };
}

