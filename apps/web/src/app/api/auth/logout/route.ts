import { NextRequest, NextResponse } from "next/server";
import { revokeSessionToken } from "@/server/auth/session";
import { SESSION_COOKIE } from "@/server/auth/token";

export async function POST(request: NextRequest) {
  await revokeSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.APP_ENV !== "development",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
