import { NextResponse } from "next/server";
import { lockExpiredCycles } from "@/server/services/cycleService";

export async function POST() {
  try {
    const result = await lockExpiredCycles();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Cron execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
