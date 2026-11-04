import { NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { deleteUserAccount } from "@/server/services/consentService";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await deleteUserAccount(session.userId);

    // Clear session cookie
    cookies().delete("sb_session");

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Account deletion failed" },
      { status: 500 }
    );
  }
}

