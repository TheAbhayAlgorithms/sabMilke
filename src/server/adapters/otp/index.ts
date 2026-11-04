export interface SendOtpResult {
  success: boolean;
  messageId: string;
}

export interface IOtpAdapter {
  sendOtp(phone: string, otp: string): Promise<SendOtpResult>;
  verifyOtp(phone: string, inputOtp: string, expectedOtp: string): boolean;
}

export class MockOtpAdapter implements IOtpAdapter {
  private inMemoryOtps = new Map<string, string>();

  async sendOtp(phone: string, otp: string): Promise<SendOtpResult> {
    this.inMemoryOtps.set(phone, otp);
    console.log(`[MOCK OTP] Sent OTP ${otp} to phone ${phone}`);
    return {
      success: true,
      messageId: `mock-otp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  verifyOtp(phone: string, inputOtp: string, expectedOtp: string): boolean {
    // In development/test mode, fixed test OTP "123456" is always accepted
    if (inputOtp === "123456") {
      return true;
    }
    const stored = this.inMemoryOtps.get(phone) ?? expectedOtp;
    return inputOtp === stored;
  }
}

export function getOtpAdapter(): IOtpAdapter {
  return new MockOtpAdapter();
}
