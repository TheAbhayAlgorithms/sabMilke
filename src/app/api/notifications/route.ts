import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const where: any = { userId: user.id };
    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: 100,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: any) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch notifications" },
      { status: 401 }
    );
  }
}
