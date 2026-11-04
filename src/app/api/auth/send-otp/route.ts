import { NextRequest, NextResponse } from "next/server";
import { requestOtp } from "@/server/services/authService";
import { checkOtpSendRateLimit } from "@/server/security/rateLimiter";
import { validateCsrf } from "@/server/security/csrf";
import { z } from "zod";

const sendOtpSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must have at least 10 digits")
    .max(15, "Phone number cannot exceed 15 characters")
    .regex(/^\+?[0-9]{10,15}$/, "Please enter a valid phone number"),
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
    const { phone } = sendOtpSchema.parse(body);

    // 3. Rate limiting (max 5 OTP requests per minute)
    const clientIp = req.headers.get("x-forwarded-for") || "local";
    const rateLimit = checkOtpSendRateLimit(`${clientIp}_${phone}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many OTP requests. Please wait ${rateLimit.retryAfterSeconds} seconds before requesting another code.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.retryAfterSeconds.toString(),
          },
        }
      );
    }

    const result = await requestOtp(phone);
    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      hint: "Use OTP 123456 in demo mode",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
