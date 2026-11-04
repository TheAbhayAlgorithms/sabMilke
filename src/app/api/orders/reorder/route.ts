import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { reorderLastMonth } from "@/server/services/orderService";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { cycleId } = await req.json();
    if (!cycleId) {
      return NextResponse.json({ error: "Active cycleId is required." }, { status: 400 });
    }

    const result = await reorderLastMonth(session.userId, cycleId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reorder failed" },
      { status: 400 }
    );
  }
}

