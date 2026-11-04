import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";
import { CycleManagerClient } from "@/components/admin/CycleManagerClient";

export default async function AdminCyclesPage() {
  const session = await getCurrentSession();
  requirePlatformAdmin(session);

  const rawCycles = await prisma.cycle.findMany({
    include: {
      society: true,
      orders: {
        where: { status: { in: ["PAID", "CONFIRMED", "ALLOCATED"] } },
      },
      cycleSkus: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const societies = await prisma.society.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const cycles = rawCycles.map((c) => {
    const totalPooledUnits = c.cycleSkus.reduce((sum, cs) => sum + cs.pooledQuantity, 0);
    const totalOrderValuePaise = c.orders.reduce((sum, o) => sum + o.totalGuaranteedPaise, 0);

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      opensAt: c.opensAt.toISOString(),
      locksAt: c.locksAt.toISOString(),
      deliveryTargetDate: c.deliveryTargetDate.toISOString(),
      minSocietyValuePaise: c.minSocietyValuePaise,
      minHouseholds: c.minHouseholds,
      society: {
        id: c.society.id,
        name: c.society.name,
      },
      ordersCount: c.orders.length,
      totalPooledUnits,
      totalOrderValuePaise,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <CycleManagerClient initialCycles={cycles} societies={societies} />
    </div>
  );
}

