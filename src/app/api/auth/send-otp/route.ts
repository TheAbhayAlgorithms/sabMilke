import { NextRequest, NextResponse } from "next/server";
import { requestOtp } from "@/server/services/authService";
import { z } from "zod";

const sendOtpSchema = z.object({
  phone: z.string().min(10, "Phone number must have at least 10 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = sendOtpSchema.parse(body);

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

