import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { joinSociety } from "@/server/services/societyService";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Please log in before joining a society." }, { status: 401 });
    }

    const body = await req.json();
    const { societyId, flatId, name } = body;

    if (!societyId || !flatId) {
      return NextResponse.json({ error: "Society and Flat selection are required." }, { status: 400 });
    }

    const result = await joinSociety(session.userId, {
      userId: session.userId,
      societyId,
      flatId,
      name,
    });

    // Update session cookie with refreshed token
    cookies().set("sb_session", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({
      success: true,
      membership: result.membership,
      session: result.session,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to join society" },
      { status: 400 }
    );
  }
}

