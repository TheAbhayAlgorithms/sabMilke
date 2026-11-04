import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { saveConsent, revokeAllConsent, getActiveConsent } from "@/server/services/consentService";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const consent = await getActiveConsent(session.userId);
    return NextResponse.json({ consent });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Failed to fetch consent" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, purposes } = body;

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    if (action === "revoke") {
      const result = await revokeAllConsent(session.userId);
      return NextResponse.json(result);
    }

    const consent = await saveConsent(session.userId, purposes, ipAddress, userAgent);
    return NextResponse.json({ success: true, consent });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record consent" },
      { status: 400 }
    );
  }
}
