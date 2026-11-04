import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { joinSociety } from "@/server/services/societyService";
import { validateCsrf } from "@/server/security/csrf";
import { cookies } from "next/headers";
import { z } from "zod";

const joinSocietySchema = z.object({
  societyId: z.string().min(1, "Society selection is required"),
  flatId: z.string().min(1, "Flat selection is required"),
  name: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.reason }, { status: 403 });
    }

    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Please log in before joining a society." }, { status: 401 });
    }

    const body = await req.json();
    const { societyId, flatId, name } = joinSocietySchema.parse(body);

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
