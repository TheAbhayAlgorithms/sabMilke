import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireCaptain } from "@/server/auth/guards";
import { getCaptainParticipation } from "@/server/services/societyService";
import { redirect } from "next/navigation";
import { CaptainParticipationClient } from "@/components/captain/CaptainParticipationClient";

export default async function CaptainParticipationPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?callbackUrl=/captain/participation");
  }

  // Captain or Platform Admin access guard
  if (session.activeRole !== "CAPTAIN" && session.activeRole !== "PLATFORM_ADMIN") {
    redirect("/");
  }

  const societyId = session.activeSocietyId || session.memberships[0]?.societyId;
  if (!societyId) {
    redirect("/join");
  }

  const data = await getCaptainParticipation(societyId);

  return <CaptainParticipationClient data={data as any} />;
}
