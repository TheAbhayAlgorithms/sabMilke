import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { redirect } from "next/navigation";
import { CheckoutClient } from "@/components/resident/CheckoutClient";

export default async function CheckoutPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?callbackUrl=/checkout");
  }

  // Load user profile, memberships, wallet, and active cycle
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      wallet: true,
      memberships: {
        include: {
          society: {
            include: { dropPoints: true },
          },
          flat: true,
        },
      },
    },
  });

  const membership = user?.memberships[0];
  if (!membership) {
    redirect("/join");
  }

  const activeCycle = await prisma.cycle.findFirst({
    where: { societyId: membership.societyId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });

  if (!activeCycle) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-xs text-gray-500">
        There is currently no open order cycle for {membership.society.name}. Please check back when the next monthly cycle opens!
      </div>
    );
  }

  const dropPoint = membership.society.dropPoints[0];

  return (
    <CheckoutClient
      society={{
        id: membership.society.id,
        name: membership.society.name,
        dropPointName: dropPoint ? dropPoint.name : "Main Drop Zone",
        dropPointInstructions: dropPoint ? dropPoint.instructions : null,
      }}
      cycle={{
        id: activeCycle.id,
        name: activeCycle.name,
        locksAt: activeCycle.locksAt.toISOString(),
        deliveryTargetDate: activeCycle.deliveryTargetDate.toISOString(),
      }}
      flat={{
        id: membership.flat.id,
        flatNumber: membership.flat.flatNumber,
        tower: membership.flat.tower,
      }}
      walletBalancePaise={user?.wallet?.balancePaise ?? 0}
    />
  );
}

