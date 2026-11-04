import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role, MembershipStatus } from "@prisma/client";

const COOKIE_NAME = "sb_session";
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "default_super_secret_session_key_min_32_characters_societybuy"
);

export interface SessionMembership {
  societyId: string;
  societyName: string;
  flatId: string;
  flatNumber: string;
  role: Role;
  status: MembershipStatus;
}

export interface SessionPayload {
  userId: string;
  phone: string;
  name: string;
  activeSocietyId?: string;
  activeFlatId?: string;
  activeRole: Role | "SUPPLIER" | "PLATFORM_ADMIN";
  supplierId?: string;
  memberships: SessionMembership[];
}

/**
 * Creates a signed JWT session token.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

/**
 * Verifies a JWT session token and returns the typed payload.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Reads the current session from incoming cookies in Next.js Server Components / Actions / Route Handlers.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Sets the session cookie on response headers.
 */
export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Clears the session cookie.
 */
export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}
