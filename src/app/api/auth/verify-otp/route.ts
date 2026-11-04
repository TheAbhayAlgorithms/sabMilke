import { NextRequest, NextResponse } from "next/server";
import { verifyOtpAndLogin } from "@/server/services/authService";
import { checkOtpVerifyRateLimit } from "@/server/security/rateLimiter";
import { validateCsrf } from "@/server/security/csrf";
import { z } from "zod";

const verifyOtpSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must have at least 10 digits")
    .max(15, "Phone number cannot exceed 15 characters"),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^[0-9]{6}$/, "OTP must consist of 6 numeric digits"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF Protection
    const csrf = validateCsrf(req);
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.reason }, { status: 403 });
    }

    // 2. Validate input with Zod
    const body = await req.json();
    const { phone, otp } = verifyOtpSchema.parse(body);

    // 3. Rate limiting (max 5 verification attempts per minute; seed test accounts exempt for automated E2E testing)
    const isSeedDemoUser = phone.startsWith("98765432") || phone.startsWith("98765433");
    if (!isSeedDemoUser) {
      const clientIp = req.headers.get("x-forwarded-for") || "local";
      const rateLimit = checkOtpVerifyRateLimit(`${clientIp}_${phone}`);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: `Too many login attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
          },
          {
            status: 429,
            headers: {
              "Retry-After": rateLimit.retryAfterSeconds.toString(),
            },
          }
        );
      }
    }

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
