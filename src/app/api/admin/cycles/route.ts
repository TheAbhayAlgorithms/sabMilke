import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { createCycle } from "@/server/services/cycleService";
import { z } from "zod";

const createCycleSchema = z.object({
  societyId: z.string(),
  name: z.string().min(3),
  opensAt: z.string().transform((v) => new Date(v)),
  locksAt: z.string().transform((v) => new Date(v)),
  deliveryTargetDate: z.string().transform((v) => new Date(v)),
  minSocietyValuePaise: z.number().int().optional(),
  minHouseholds: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    requirePlatformAdmin(session);

    const json = await req.json();
    const parsed = createCycleSchema.parse(json);

    const cycle = await createCycle(session!.userId, parsed);

    return NextResponse.json({
      success: true,
      cycle,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create cycle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
