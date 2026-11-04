import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { listBenchmarkPrices, upsertBenchmarkPrice } from "@/server/services/benchmarkService";
import { validateCsrf } from "@/server/security/csrf";
import { Role } from "@prisma/client";
import { z } from "zod";

const benchmarkSchema = z.object({
  skuId: z.string().min(1, "skuId is required"),
  retailerName: z.string().min(1, "retailerName is required"),
  pricePaise: z.number().int().positive("pricePaise must be a positive integer"),
});

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
    return NextResponse.json(
      { error: err.message || "Failed to fetch benchmarks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.reason }, { status: 403 });
    }

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
    const parsed = benchmarkSchema.parse(body);

    const benchmark = await upsertBenchmarkPrice({
      actorId: user.userId,
      skuId: parsed.skuId,
      retailerName: parsed.retailerName,
      pricePaise: parsed.pricePaise,
    });

    return NextResponse.json({ benchmark });
  } catch (err: any) {
    const message = err instanceof z.ZodError ? err.errors[0]?.message : err.message;
    return NextResponse.json(
      { error: message || "Failed to update benchmark price" },
      { status: 400 }
    );
  }
}
