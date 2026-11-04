import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireRole } from "@/server/auth/guards";
import { getSocietyAdminAnalytics } from "@/server/services/analyticsService";
import { SocietyAdminDashboardClient } from "@/components/society-admin/SocietyAdminDashboardClient";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SocietyAdminPage() {
  const session = await getCurrentSession();
  const user = requireRole(session, [Role.SOCIETY_ADMIN, Role.PLATFORM_ADMIN]);

  const targetMembership =
    user.memberships.find((m) => m.role === Role.SOCIETY_ADMIN) ||
    user.memberships[0];

  if (!targetMembership) {
    notFound();
  }

  const analytics = await getSocietyAdminAnalytics(targetMembership.societyId);

  return <SocietyAdminDashboardClient analytics={analytics} />;
}
