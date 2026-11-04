import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { openCycle } from "@/server/services/cycleService";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    requirePlatformAdmin(session);

    const cycle = await openCycle(session!.userId, params.id);

    return NextResponse.json({
      success: true,
      cycle,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to open cycle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
