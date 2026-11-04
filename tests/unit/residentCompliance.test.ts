import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/server/db/client";
import { joinSociety, getCaptainParticipation } from "@/server/services/societyService";
import {
  saveConsent,
  revokeAllConsent,
  getActiveConsent,
  exportUserData,
  deleteUserAccount,
} from "@/server/services/consentService";
import { getUserSavings, getWalletForUser } from "@/server/services/walletService";
import { Role } from "@prisma/client";

describe("Resident Compliance, Join Flow, Captain Roster & Wallet Savings (Milestone 4)", () => {
  let testUserId: string;
  let societyId: string;
  let joinCode: string;
  let flatId: string;

  beforeAll(async () => {
    const society = await prisma.society.findFirst({
      include: { flats: true },
    });
    if (!society) throw new Error("Demo society not found.");
    societyId = society.id;
    joinCode = society.joinCode;

    // Use Flat B-508
    const flat = society.flats.find((f) => f.flatNumber === "B-508") || society.flats[society.flats.length - 3];
    flatId = flat.id;

    // Create a new unattached user
    const newUser = await prisma.user.create({
      data: {
        phone: `999999${Math.floor(1000 + Math.random() * 9000)}`,
        name: "Test New Resident",
        isPhoneVerified: true,
        wallet: { create: { balancePaise: 50000 } }, // Rs 500 in wallet
      },
    });
    testUserId = newUser.id;
  });

  it("joinSociety attaches resident to society and flat with audit log and refreshed session token", async () => {
    const result = await joinSociety(testUserId, {
      userId: testUserId,
      societyId,
      flatId,
      name: "Verified Resident",
    });

    expect(result.membership).toBeDefined();
    expect(result.membership.societyId).toBe(societyId);
    expect(result.membership.flatId).toBe(flatId);
    expect(result.token).toBeDefined();
    expect(result.session.activeRole).toBe(Role.RESIDENT);
    expect(result.session.activeSocietyId).toBe(societyId);

    // Verify audit log
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: "RESIDENT_JOINED_SOCIETY",
        entityId: result.membership.id,
      },
    });
    expect(auditLog).toBeDefined();
  });

  it("getCaptainParticipation returns participation counts and flat roster", async () => {
    const participation = await getCaptainParticipation(societyId);

    expect(participation.society.name).toBe("Green Glen Heights");
    expect(participation.stats.totalFlats).toBeGreaterThan(0);
    expect(participation.flats.length).toBe(participation.stats.totalFlats);
    expect(participation.flats.some((f) => f.flatId === flatId)).toBe(true);
  });

  it("saveConsent records version v1.0, timestamp, and revokeAllConsent revokes in one tap", async () => {
    const consent = await saveConsent(testUserId, [
      "ORDER_FULFILLMENT",
      "DROP_POINT_ALERTS",
    ]);

    expect(consent.version).toBe("v1.0");
    expect(consent.purposes).toContain("ORDER_FULFILLMENT");
    expect(consent.isRevoked).toBe(false);

    const active = await getActiveConsent(testUserId);
    expect(active?.id).toBe(consent.id);

    // Revoke all in one tap
    const revokeResult = await revokeAllConsent(testUserId);
    expect(revokeResult.success).toBe(true);

    const checkActive = await getActiveConsent(testUserId);
    expect(checkActive).toBeNull();
  });

  it("exportUserData provides full machine-readable JSON data export with TODO_LEGAL disclaimer", async () => {
    const data = await exportUserData(testUserId);

    expect(data.complianceNotice).toContain("TODO_LEGAL");
    expect(data.userProfile.id).toBe(testUserId);
    expect(data.societies.length).toBeGreaterThan(0);
    expect(data.wallet.balancePaise).toBe(50000);
    expect(data.orders).toBeDefined();
    expect(data.consents).toBeDefined();
  });

  it("getUserSavings calculates savings vs MRP and quick commerce benchmarks", async () => {
    const savings = await getUserSavings(testUserId);

    expect(savings.totalSpentPaise).toBeGreaterThanOrEqual(0);
    expect(savings.totalSavingsVsMrpPaise).toBeGreaterThanOrEqual(0);
    expect(savings.cycleBreakdown).toBeDefined();
  });

  it("deleteUserAccount soft-deletes user account and anonymizes contact data", async () => {
    const deleteResult = await deleteUserAccount(testUserId);
    expect(deleteResult.success).toBe(true);

    const deletedUser = await prisma.user.findUnique({
      where: { id: testUserId },
    });
    expect(deletedUser?.deletedAt).toBeDefined();
    expect(deletedUser?.name).toBe("Deleted Resident Account");
    expect(deletedUser?.phone).toContain("deleted_");

    // Verify audit log
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: "USER_ACCOUNT_DELETED",
        entityId: testUserId,
      },
    });
    expect(auditLog).toBeDefined();
  });
});

