import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (notification.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: { isRead: true },
    });

    return NextResponse.json({ notification: updated });
  } catch (err: any) {
    console.error("POST /api/notifications/[id]/read error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to mark notification read" },
      { status: 400 }
    );
  }
}
