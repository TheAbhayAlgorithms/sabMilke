/**
 * Sliding Window In-Memory Rate Limiter for Authentication & Sensitive Operations.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSeconds: number;
}

/**
 * Checks and records an access attempt against a sliding window rate limit.
 *
 * @param key Unique identifier (e.g. "otp_send:9876543210" or "login:127.0.0.1")
 * @param limit Maximum allowed requests within the window
 * @param windowMs Window duration in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60000,
  now = Date.now()
): RateLimitResult {
  const windowStart = now - windowMs;
  const record = store.get(key) || { timestamps: [] };

  // Evict timestamps outside current window
  const activeTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (activeTimestamps.length >= limit) {
    const oldest = activeTimestamps[0];
    const resetMs = Math.max(0, oldest + windowMs - now);
    const retryAfterSeconds = Math.ceil(resetMs / 1000);

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetMs,
      retryAfterSeconds,
    };
  }

  // Record this attempt
  activeTimestamps.push(now);
  store.set(key, { timestamps: activeTimestamps });

  const remaining = Math.max(0, limit - activeTimestamps.length);
  const resetMs = windowMs;

  return {
    allowed: true,
    limit,
    remaining,
    resetMs,
    retryAfterSeconds: 0,
  };
}

/**
 * OTP Request rate limit: Max 5 sends per minute per phone number/IP.
 */
export function checkOtpSendRateLimit(phoneOrIp: string) {
  return checkRateLimit(`otp_send:${phoneOrIp}`, 5, 60000);
}

/**
 * OTP Verification rate limit: Max 5 attempts per minute per phone number/IP.
 */
export function checkOtpVerifyRateLimit(phoneOrIp: string) {
  return checkRateLimit(`otp_verify:${phoneOrIp}`, 5, 60000);
}

/**
 * Clear rate limit store (used in test teardown).
 */
export function clearRateLimits() {
  store.clear();
}

