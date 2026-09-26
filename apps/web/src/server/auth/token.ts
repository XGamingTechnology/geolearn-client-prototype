import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "geolearn_session";

export function createOpaqueSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions(expires: Date) {
  const secure = process.env.APP_ENV !== "development" && process.env.NODE_ENV !== "test";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}
