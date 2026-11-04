import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { lockCycle } from "@/server/services/cycleService";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    requirePlatformAdmin(session);

    // Admin calling lock endpoint from UI is a force-lock
    const cycle = await lockCycle(session!.userId, params.id, true);

    return NextResponse.json({
      success: true,
      cycle,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to lock cycle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
