import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { getUserSavings } from "@/server/services/walletService";
import { redirect } from "next/navigation";
import { SavingsClient } from "@/components/resident/SavingsClient";

export default async function SavingsPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?callbackUrl=/savings");
  }

  const savingsData = await getUserSavings(session.userId);

  return <SavingsClient savingsData={savingsData} userName={session.name} />;
}

