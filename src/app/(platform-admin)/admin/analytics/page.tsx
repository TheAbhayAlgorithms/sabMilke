import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { getPlatformAnalytics } from "@/server/services/analyticsService";
import { AdminAnalyticsClient } from "@/components/admin/AdminAnalyticsClient";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const session = await getCurrentSession();
  if (!session?.userId) {
    redirect("/login?next=/admin/analytics");
  }

  const isPlatformAdmin =
    session.activeRole === Role.PLATFORM_ADMIN ||
    session.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

  if (!isPlatformAdmin) {
    redirect("/");
  }

  const analytics = await getPlatformAnalytics();

  return <AdminAnalyticsClient analytics={analytics} />;
}

