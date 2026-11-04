import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";

export async function POST(_req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const result = await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (err: any) {
    console.error("POST /api/notifications/mark-all-read error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to mark all notifications read" },
      { status: 400 }
    );
  }
}
