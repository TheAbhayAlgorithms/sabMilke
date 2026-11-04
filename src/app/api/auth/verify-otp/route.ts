import { NextRequest, NextResponse } from "next/server";
import { verifyOtpAndLogin } from "@/server/services/authService";
import { z } from "zod";

const verifyOtpSchema = z.object({
  phone: z.string().min(10, "Phone number must have at least 10 digits"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, otp } = verifyOtpSchema.parse(body);

    const { token, session } = await verifyOtpAndLogin(phone, otp);

    const response = NextResponse.json({
      success: true,
      session,
    });

    response.cookies.set("sb_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
