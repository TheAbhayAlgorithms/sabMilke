import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";
import { MembershipStatus } from "@prisma/client";

export const CONSENT_PURPOSES = [
  {
    id: "ORDER_FULFILLMENT",
    labelEn: "Order Fulfillment & Society Drop-Point Delivery",
    labelHi: "ऑर्डर पूर्ति और सोसाइटी ड्रॉप-पॉइंट डिलीवरी",
    descriptionEn: "Allows us to pool your items, share flat-level packing slips with the Captain, and deliver to your society drop point.",
    descriptionHi: "सोसाइटी ड्रॉप पॉइंट पर सामान पहुंचाने और फ्लैट-वार पैकिंग लिस्ट तैयार करने के लिए आवश्यक।",
  },
  {
    id: "DROP_POINT_ALERTS",
    labelEn: "Arrival, Countdown & Handover Notifications",
    labelHi: "आगमन, उलटी गिनती और हैंडओवर सूचनाएं",
    descriptionEn: "Receive WhatsApp and SMS alerts when cycles lock, trucks arrive, and goods are ready for QR collection.",
    descriptionHi: "सामान आने और क्यूआर कोड से लेने के लिए तैयार होने पर व्हाट्सएप/एसएमएस सूचनाएं प्राप्त करें।",
  },
  {
    id: "ANONYMIZED_DEMAND_LADDER",
    labelEn: "Anonymized Society Demand Aggregation",
    labelHi: "अनाम सोसाइटी मांग एकत्रीकरण",
    descriptionEn: "Pool your requested quantities with neighbors to unlock wholesale slab discounts. Personal names are never shown on the live discount ladder.",
    descriptionHi: "थोक छूट पाने के लिए पड़ोसियों के साथ मात्रा जोड़ें। डिस्काउंट लेडर पर आपका नाम कभी नहीं दिखाया जाता।",
  },
];

export async function getActiveConsent(userId: string) {
  return prisma.consent.findFirst({
    where: { userId, isRevoked: false },
    orderBy: { consentedAt: "desc" },
  });
}

export async function saveConsent(
  userId: string,
  purposes: string[],
  ipAddress?: string,
  userAgent?: string
) {
  if (!purposes || purposes.length === 0) {
    throw new Error("At least one consent purpose must be acknowledged.");
  }

  return prisma.$transaction(async (tx) => {
    // Revoke any prior consent
    await tx.consent.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    const consent = await tx.consent.create({
      data: {
        userId,
        version: "v1.0",
        purposes,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        isRevoked: false,
      },
    });

    await recordAuditLog(
      {
        actorId: userId,
        action: "CONSENT_RECORDED",
        entity: "Consent",
        entityId: consent.id,
        after: { version: consent.version, purposes: consent.purposes },
      },
      tx
    );

    return consent;
  });
}

export async function revokeAllConsent(userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.consent.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    await recordAuditLog(
      {
        actorId: userId,
        action: "CONSENT_REVOKED",
        entity: "Consent",
        entityId: userId,
        after: { isRevoked: true },
      },
      tx
    );

    return { success: true };
  });
}

export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { society: true, flat: true },
      },
      wallet: {
        include: {
          transactions: { orderBy: { createdAt: "desc" } },
        },
      },
      orders: {
        include: {
          items: { include: { sku: { include: { product: true } } } },
          payments: true,
          refunds: true,
        },
        orderBy: { createdAt: "desc" },
      },
      consents: { orderBy: { consentedAt: "desc" } },
      tickets: {
        include: { messages: true },
      },
    },
  });

  if (!user) throw new Error("User not found.");

  return {
    exportTimestamp: new Date().toISOString(),
    complianceNotice: "TODO_LEGAL: Data export generated per Indian Digital Personal Data Protection Act (DPDP).",
    userProfile: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
    },
    societies: user.memberships.map((m) => ({
      society: m.society.name,
      joinCode: m.society.joinCode,
      flat: m.flat.flatNumber,
      role: m.role,
      status: m.status,
    })),
    wallet: {
      balancePaise: user.wallet?.balancePaise ?? 0,
      transactions: user.wallet?.transactions || [],
    },
    orders: user.orders,
    consents: user.consents,
    tickets: user.tickets,
  };
}

export async function deleteUserAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new Error("User not found.");

  return prisma.$transaction(async (tx) => {
    // 1. Revoke all consents
    await tx.consent.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    // 2. Suspend memberships
    await tx.membership.updateMany({
      where: { userId },
      data: { status: MembershipStatus.SUSPENDED },
    });

    // 3. Soft-delete user & anonymize personal data
    const anonymizedPhone = `deleted_${Date.now()}_${user.id.slice(-6)}`;
    await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        phone: anonymizedPhone,
        name: "Deleted Resident Account",
      },
    });

    // 4. Record in AuditLog
    await recordAuditLog(
      {
        actorId: userId,
        action: "USER_ACCOUNT_DELETED",
        entity: "User",
        entityId: userId,
        after: { deletedAt: new Date(), anonymized: true },
      },
      tx
    );

    return { success: true };
  });
}
