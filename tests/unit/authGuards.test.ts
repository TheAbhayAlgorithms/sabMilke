import { describe, it, expect } from "vitest";
import {
  requireAuth,
  requireRole,
  requireSocietyAccess,
  requireSupplier,
  requirePlatformAdmin,
  UnauthorizedError,
  ForbiddenError,
  CrossSocietyAccessError,
} from "@/server/auth/guards";
import { SessionPayload } from "@/server/auth/session";
import { Role, MembershipStatus } from "@prisma/client";

describe("Role Guards & Cross-Society Isolation (Rule 5)", () => {
  const residentSession: SessionPayload = {
    userId: "user-res-1",
    phone: "9876543211",
    name: "Resident A",
    activeRole: Role.RESIDENT,
    activeSocietyId: "society-1",
    memberships: [
      {
        societyId: "society-1",
        societyName: "Society One",
        flatId: "flat-1",
        flatNumber: "A-101",
        role: Role.RESIDENT,
        status: MembershipStatus.APPROVED,
      },
    ],
  };

  const captainSession: SessionPayload = {
    userId: "user-cap-1",
    phone: "9876543210",
    name: "Captain Vikram",
    activeRole: Role.CAPTAIN,
    activeSocietyId: "society-1",
    memberships: [
      {
        societyId: "society-1",
        societyName: "Society One",
        flatId: "flat-2",
        flatNumber: "A-402",
        role: Role.CAPTAIN,
        status: MembershipStatus.APPROVED,
      },
    ],
  };

  const supplierSession: SessionPayload = {
    userId: "user-sup-1",
    phone: "9876543301",
    name: "Apex Supplier",
    activeRole: "SUPPLIER",
    supplierId: "supplier-1",
    memberships: [],
  };

  const adminSession: SessionPayload = {
    userId: "user-adm-1",
    phone: "9876543200",
    name: "Admin Ananya",
    activeRole: Role.PLATFORM_ADMIN,
    memberships: [
      {
        societyId: "society-1",
        societyName: "Society One",
        flatId: "flat-0",
        flatNumber: "Admin",
        role: Role.PLATFORM_ADMIN,
        status: MembershipStatus.APPROVED,
      },
    ],
  };

  it("requireAuth throws UnauthorizedError if no session is present", () => {
    expect(() => requireAuth(null)).toThrow(UnauthorizedError);
    expect(requireAuth(residentSession)).toEqual(residentSession);
  });

  it("requireRole allows permitted role and blocks others", () => {
    expect(requireRole(residentSession, [Role.RESIDENT])).toEqual(residentSession);
    expect(() => requireRole(residentSession, [Role.CAPTAIN])).toThrow(ForbiddenError);
    expect(requireRole(captainSession, [Role.CAPTAIN, Role.RESIDENT])).toEqual(captainSession);
    expect(requireRole(supplierSession, ["SUPPLIER"])).toEqual(supplierSession);
  });

  it("enforces cross-society access protection (Rule 5)", () => {
    // Resident belongs to society-1; access to society-1 is allowed
    expect(requireSocietyAccess(residentSession, "society-1")).toEqual(residentSession);

    // Cross-society access to society-2 is strictly rejected!
    expect(() => requireSocietyAccess(residentSession, "society-2")).toThrow(CrossSocietyAccessError);
    expect(() => requireSocietyAccess(captainSession, "society-2")).toThrow(CrossSocietyAccessError);

    // Platform admin has superuser access across societies
    expect(requireSocietyAccess(adminSession, "society-2")).toEqual(adminSession);
  });

  it("requireSupplier validates supplier role and ID", () => {
    expect(requireSupplier(supplierSession)).toEqual(supplierSession);
    expect(() => requireSupplier(residentSession)).toThrow(ForbiddenError);
    expect(requireSupplier(adminSession)).toEqual(adminSession);
  });

  it("requirePlatformAdmin only allows platform admin", () => {
    expect(requirePlatformAdmin(adminSession)).toEqual(adminSession);
    expect(() => requirePlatformAdmin(residentSession)).toThrow(ForbiddenError);
    expect(() => requirePlatformAdmin(captainSession)).toThrow(ForbiddenError);
    expect(() => requirePlatformAdmin(supplierSession)).toThrow(ForbiddenError);
  });
});
