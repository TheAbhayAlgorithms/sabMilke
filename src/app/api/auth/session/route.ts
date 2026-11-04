import { NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";

export async function GET() {
  const session = await getCurrentSession();
  return NextResponse.json({ session });
}
