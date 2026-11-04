import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { listBenchmarkPrices, upsertBenchmarkPrice } from "@/server/services/benchmarkService";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    if (!isPlatformAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Platform admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const skuId = searchParams.get("skuId") || undefined;

    const benchmarks = await listBenchmarkPrices(skuId);
    return NextResponse.json({ benchmarks });
  } catch (err: any) {
    console.error("GET /api/admin/benchmarks error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch benchmarks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = requireAuth(session);

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    if (!isPlatformAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Platform admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { skuId, retailerName, pricePaise } = body;

    if (!skuId || !retailerName || pricePaise === undefined) {
      return NextResponse.json(
        { error: "skuId, retailerName, and pricePaise are required." },
        { status: 400 }
      );
    }

    const benchmark = await upsertBenchmarkPrice({
      actorId: user.id,
      skuId,
      retailerName,
      pricePaise: Math.round(Number(pricePaise)),
    });

    return NextResponse.json({ benchmark });
  } catch (err: any) {
    console.error("POST /api/admin/benchmarks error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update benchmark price" },
      { status: 400 }
    );
  }
}
