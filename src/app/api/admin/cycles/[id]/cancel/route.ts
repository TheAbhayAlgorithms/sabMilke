import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { cancelCycle } from "@/server/services/cycleService";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    requirePlatformAdmin(session);

    const body = await req.json().catch(() => ({}));
    const reason = (body.reason as string) || "Administrative cancellation by platform admin";

    const cycle = await cancelCycle(session!.userId, params.id, reason);

    return NextResponse.json({
      success: true,
      cycle,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to cancel cycle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

