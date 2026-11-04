import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";
import { Role, MembershipStatus, CycleStatus, OrderStatus } from "@prisma/client";
import { createSessionToken, SessionMembership, SessionPayload } from "@/server/auth/session";

export async function getSocietyByJoinCode(joinCode: string) {
  const cleanCode = joinCode.trim().toUpperCase();
  const society = await prisma.society.findUnique({
    where: { joinCode: cleanCode },
    include: {
      dropPoints: true,
      flats: {
        orderBy: [{ tower: "asc" }, { flatNumber: "asc" }],
      },
    },
  });

  if (!society) {
    throw new Error(`Society with join code '${cleanCode}' not found.`);
  }

  return society;
}

export interface JoinSocietyInput {
  userId: string;
  societyId: string;
  flatId: string;
  name?: string;
}

export async function joinSociety(actorId: string, input: JoinSocietyInput) {
  const society = await prisma.society.findUnique({
    where: { id: input.societyId },
  });
  if (!society) throw new Error("Society not found.");

  const flat = await prisma.flat.findFirst({
    where: { id: input.flatId, societyId: input.societyId },
  });
  if (!flat) throw new Error("Flat does not belong to this society.");

  return prisma.$transaction(async (tx) => {
    // If user provided a name, update profile
    if (input.name && input.name.trim()) {
      await tx.user.update({
        where: { id: input.userId },
        data: { name: input.name.trim() },
      });
    }

    // Upsert membership
    const membership = await tx.membership.upsert({
      where: {
        userId_societyId: {
          userId: input.userId,
          societyId: input.societyId,
        },
      },
      update: {
        flatId: input.flatId,
        status: MembershipStatus.APPROVED, // Captain or system approves resident
      },
      create: {
        userId: input.userId,
        societyId: input.societyId,
        flatId: input.flatId,
        role: Role.RESIDENT,
        status: MembershipStatus.APPROVED,
      },
      include: {
        society: true,
        flat: true,
      },
    });

    // Record in audit log
    await recordAuditLog(
      {
        societyId: input.societyId,
        actorId,
        action: "RESIDENT_JOINED_SOCIETY",
        entity: "Membership",
        entityId: membership.id,
        after: {
          societyId: input.societyId,
          flatId: input.flatId,
          flatNumber: flat.flatNumber,
          role: membership.role,
        },
      },
      tx
    );

    // Fetch user and all memberships to generate a refreshed session token
    const user = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      include: {
        memberships: {
          include: { society: true, flat: true },
        },
        supplierUser: true,
      },
    });

    const memberships: SessionMembership[] = user.memberships.map((m) => ({
      societyId: m.societyId,
      societyName: m.society.name,
      flatId: m.flatId,
      flatNumber: m.flat.flatNumber,
      role: m.role,
      status: m.status,
    }));

    const sessionPayload: SessionPayload = {
      userId: user.id,
      phone: user.phone,
      name: user.name,
      activeRole: Role.RESIDENT,
      activeSocietyId: input.societyId,
      activeFlatId: input.flatId,
      memberships,
    };

    const token = await createSessionToken(sessionPayload);
    return { membership, token, session: sessionPayload };
  });
}

export async function getCaptainParticipation(societyId: string) {
  const society = await prisma.society.findUnique({
    where: { id: societyId },
    include: {
      flats: {
        include: {
          memberships: {
            include: { user: true },
          },
        },
        orderBy: [{ tower: "asc" }, { flatNumber: "asc" }],
      },
      cycles: {
        where: { status: CycleStatus.OPEN },
        include: {
          cycleSkus: true,
          orders: {
            where: { status: { in: [OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.ALLOCATED] } },
            include: { user: true, flat: true },
          },
        },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!society) throw new Error("Society not found.");

  const activeCycle = society.cycles[0] || null;
  const orderedFlatIds = new Set(activeCycle ? activeCycle.orders.map((o) => o.flatId) : []);

  const totalPooledUnits = activeCycle
    ? activeCycle.cycleSkus.reduce((sum, cs) => sum + cs.pooledQuantity, 0)
    : 0;

  const totalSocietyOrders = activeCycle ? activeCycle.orders.length : 0;
  const totalValuePaise = activeCycle
    ? activeCycle.orders.reduce((sum, o) => sum + o.totalGuaranteedPaise, 0)
    : 0;

  const flatsParticipation = society.flats.map((flat) => {
    const hasOrdered = orderedFlatIds.has(flat.id);
    const primaryMembership = flat.memberships[0];
    const residentName = primaryMembership?.user?.name || "Unoccupied / Not registered";
    const residentPhone = primaryMembership?.user?.phone || null;

    const order = activeCycle?.orders.find((o) => o.flatId === flat.id);

    return {
      flatId: flat.id,
      flatNumber: flat.flatNumber,
      tower: flat.tower,
      hasOrdered,
      residentName,
      residentPhone,
      orderTotalPaise: order?.totalGuaranteedPaise || 0,
      orderStatus: order?.status || null,
    };
  });

  return {
    society: {
      id: society.id,
      name: society.name,
      joinCode: society.joinCode,
    },
    activeCycle: activeCycle
      ? {
          id: activeCycle.id,
          name: activeCycle.name,
          locksAt: activeCycle.locksAt,
          minSocietyValuePaise: activeCycle.minSocietyValuePaise,
          minHouseholds: activeCycle.minHouseholds,
        }
      : null,
    stats: {
      totalFlats: society.flats.length,
      orderedFlatsCount: orderedFlatIds.size,
      participationPercent: Math.round((orderedFlatIds.size / society.flats.length) * 100),
      totalPooledUnits,
      totalSocietyOrders,
      totalValuePaise,
    },
    flats: flatsParticipation,
  };
}

