import { NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { exportUserData } from "@/server/services/consentService";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const exportData = await exportUserData(session.userId);

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="societybuy-data-export-${session.userId}.json"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Data export failed" },
      { status: 500 }
    );
  }
}
