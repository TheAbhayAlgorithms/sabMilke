/**
 * Security utilities for masking sensitive user data and credentials in logs and audit trails.
 */

export function maskPhone(phone?: string | null): string {
  if (!phone) return "N/A";
  const clean = phone.trim();
  if (clean.length < 6) return "******";
  return `${clean.slice(0, 2)}******${clean.slice(-2)}`;
}

export function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return "N/A";
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `*@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

export function maskOtp(_otp?: string | null): string {
  return "******";
}

const SENSITIVE_KEY_REGEX =
  /token|otp|secret|password|authorization|auth|creditcard|cookie|cvv|jwt|privatekey|apikey|api_key/i;

/**
 * Deeply sanitizes objects before writing to audit logs or console output,
 * masking any credentials or authorization payloads.
 */
export function sanitizeAuditData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item));
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeAuditData(val);
      }
    }
    return sanitized;
  }

  return data;
}
