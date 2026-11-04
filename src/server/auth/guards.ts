import { SessionPayload } from "@/server/auth/session";
import { Role, MembershipStatus } from "@prisma/client";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized: Login required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden: Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class CrossSocietyAccessError extends Error {
  constructor(message = "Forbidden: Cannot access data belonging to another society") {
    super(message);
    this.name = "CrossSocietyAccessError";
  }
}

/**
 * Validates that the request has an authenticated session.
 */
export function requireAuth(session: SessionPayload | null): SessionPayload {
  if (!session || !session.userId) {
    throw new UnauthorizedError();
  }
  return session;
}

/**
 * Validates that the user has an approved membership in the given society.
 * PLATFORM_ADMIN is granted global access.
 */
export function requireSocietyAccess(
  session: SessionPayload | null,
  societyId: string,
  allowedRoles?: Role[]
): SessionPayload {
  const user = requireAuth(session);

  // Platform admin has superuser cross-society scope
  if (
    user.activeRole === Role.PLATFORM_ADMIN ||
    user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN)
  ) {
    return user;
  }

  const membership = user.memberships.find((m) => m.societyId === societyId);
  if (!membership || membership.status !== MembershipStatus.APPROVED) {
    throw new CrossSocietyAccessError();
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new ForbiddenError(
      `Role '${membership.role}' does not have permission. Required: [${allowedRoles.join(", ")}]`
    );
  }

  return user;
}

/**
 * Validates that the user has one of the allowed roles.
 */
export function requireRole(
  session: SessionPayload | null,
  allowedRoles: (Role | "SUPPLIER")[],
  societyId?: string
): SessionPayload {
  const user = requireAuth(session);

  // Platform admin is always allowed
  if (
    user.activeRole === Role.PLATFORM_ADMIN ||
    user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN)
  ) {
    return user;
  }

  if (societyId) {
    return requireSocietyAccess(
      session,
      societyId,
      allowedRoles.filter((r): r is Role => r !== "SUPPLIER")
    );
  }

  if (!allowedRoles.includes(user.activeRole)) {
    throw new ForbiddenError(
      `Role '${user.activeRole}' is not authorized. Required: [${allowedRoles.join(", ")}]`
    );
  }

  return user;
}

/**
 * Validates that the user is an active supplier.
 */
export function requireSupplier(session: SessionPayload | null): SessionPayload {
  const user = requireAuth(session);
  if (user.activeRole === Role.PLATFORM_ADMIN) return user;
  if (user.activeRole !== "SUPPLIER" || !user.supplierId) {
    throw new ForbiddenError("Supplier access required");
  }
  return user;
}

/**
 * Validates that the user is a platform admin.
 */
export function requirePlatformAdmin(session: SessionPayload | null): SessionPayload {
  const user = requireAuth(session);
  const isPlatformAdmin =
    user.activeRole === Role.PLATFORM_ADMIN ||
    user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

  if (!isPlatformAdmin) {
    throw new ForbiddenError("Platform Admin access required");
  }
  return user;
}

