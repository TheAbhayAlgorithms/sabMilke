import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { importCatalogueFromCsv } from "@/server/services/catalogueService";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    requirePlatformAdmin(session);

    const body = await req.json();
    const csvText = body.csvText as string;

    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json({ error: "Missing or invalid csvText." }, { status: 400 });
    }

    const result = await importCatalogueFromCsv(session!.userId, csvText);

    return NextResponse.json({
      success: result.importedCount > 0 || result.errors.length === 0,
      totalRows: result.totalRows,
      importedCount: result.importedCount,
      validRowsCount: result.validRows.length,
      errors: result.errors,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "CSV import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

