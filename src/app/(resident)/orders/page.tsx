import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { getOrdersForUser } from "@/server/services/orderService";
import { redirect } from "next/navigation";
import { OrdersListClient } from "@/components/resident/OrdersListClient";

export default async function OrdersPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?callbackUrl=/orders");
  }

  const [rawOrders, activeCycle] = await Promise.all([
    getOrdersForUser(session.userId),
    prisma.cycle.findFirst({
      where: { status: "OPEN" },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const orders = rawOrders.map((o) => ({
    id: o.id,
    pickupCode: o.pickupCode,
    qrCodeToken: o.qrCodeToken,
    status: o.status,
    totalGuaranteedPaise: o.totalGuaranteedPaise,
    totalFinalPaise: o.totalFinalPaise,
    totalRefundPaise: o.totalRefundPaise,
    createdAt: o.createdAt.toISOString(),
    cycle: {
      name: o.cycle.name,
      status: o.cycle.status,
      locksAt: o.cycle.locksAt.toISOString(),
      deliveryTargetDate: o.cycle.deliveryTargetDate.toISOString(),
    },
    flat: {
      flatNumber: o.flat.flatNumber,
      tower: o.flat.tower,
    },
    itemsCount: o.items.length,
  }));

  return <OrdersListClient orders={orders} activeCycleId={activeCycle?.id} />;
}

