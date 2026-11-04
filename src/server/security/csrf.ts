import { NextRequest } from "next/server";

export interface CsrfValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates request origin to protect against Cross-Site Request Forgery (CSRF).
 * Applies to state-changing methods (POST, PUT, PATCH, DELETE).
 */
export function validateCsrf(req: NextRequest): CsrfValidationResult {
  const method = req.method.toUpperCase();

  // Safe HTTP methods do not mutate state
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { valid: true };
  }

  // Webhooks from external providers (e.g. Razorpay) bypass CSRF checks
  // and are secured via cryptographic signature verification
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith("/api/webhooks/")) {
    return { valid: true };
  }

  // Check Sec-Fetch-Site if provided by modern browsers
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return {
      valid: false,
      reason: "CSRF check failed: cross-site request prohibited.",
    };
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

  if (!host) {
    return { valid: true }; // No host available (e.g. CLI or mock test context)
  }

  // Extract hostname from origin if present
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        return {
          valid: false,
          reason: `CSRF check failed: origin '${originUrl.host}' does not match host '${host}'.`,
        };
      }
    } catch {
      return { valid: false, reason: "CSRF check failed: malformed origin header." };
    }
  } else if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host !== host) {
        return {
          valid: false,
          reason: `CSRF check failed: referer '${refererUrl.host}' does not match host '${host}'.`,
        };
      }
    } catch {
      return { valid: false, reason: "CSRF check failed: malformed referer header." };
    }
  }

  return { valid: true };
}

