import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { CartClient } from "@/components/resident/CartClient";
import { redirect } from "next/navigation";

export default async function CartPage() {
  const session = await getCurrentSession();

  let walletBalancePaise = 0;
  let userFlat = null;
  let societyName = "Green Glen Heights";

  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        wallet: true,
        memberships: {
          include: { society: true, flat: true },
        },
      },
    });

    if (user?.wallet) {
      walletBalancePaise = user.wallet.balancePaise;
    }

    const membership = user?.memberships[0];
    if (membership) {
      societyName = membership.society.name;
      userFlat = {
        flatNumber: membership.flat.flatNumber,
        tower: membership.flat.tower,
      };
    }
  }

  return (
    <CartClient
      walletBalancePaise={walletBalancePaise}
      userFlat={userFlat}
      societyName={societyName}
    />
  );
}
