import { NextRequest, NextResponse } from "next/server";
import { getSocietyByJoinCode } from "@/server/services/societyService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Society join code is required." }, { status: 400 });
    }

    const society = await getSocietyByJoinCode(code);
    return NextResponse.json({ society });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch society" },
      { status: 404 }
    );
  }
}

