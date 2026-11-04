import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const referer = req.headers.get("referer") || "/";
  const response = NextResponse.redirect(new URL("/", req.url));
  response.cookies.delete("sb_session");
  return response;
}

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("sb_session");
  return response;
}

