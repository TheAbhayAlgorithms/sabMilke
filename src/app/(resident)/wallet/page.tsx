import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { getWalletForUser } from "@/server/services/walletService";
import { redirect } from "next/navigation";
import { WalletClient } from "@/components/resident/WalletClient";

export default async function WalletPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?callbackUrl=/wallet");
  }

  const wallet = await getWalletForUser(session.userId);

  const transactions = wallet.transactions.map((tx) => ({
    id: tx.id,
    amountPaise: tx.amountPaise,
    type: tx.type,
    referenceId: tx.referenceId,
    description: tx.description,
    createdAt: tx.createdAt.toISOString(),
  }));

  return (
    <WalletClient
      balancePaise={wallet.balancePaise}
      transactions={transactions}
      userName={session.name}
    />
  );
}

