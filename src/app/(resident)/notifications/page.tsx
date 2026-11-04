import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { NotificationCenterClient } from "@/components/notifications/NotificationCenterClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getCurrentSession();
  if (!session?.userId) {
    redirect("/login?next=/notifications");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.userId },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  const serialized = notifications.map((n) => ({
    id: n.id,
    channel: n.channel,
    title: n.title,
    body: n.body,
    data: n.data,
    isRead: n.isRead,
    sentAt: n.sentAt.toISOString(),
  }));

  return <NotificationCenterClient initialNotifications={serialized} />;
}

