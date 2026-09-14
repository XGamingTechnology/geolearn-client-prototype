import { NextRequest, NextResponse } from "next/server";
import { authenticateTeacher } from "@/server/auth/queries";
import { createTeacherSession } from "@/server/auth/session";
import { AuthRateLimitedError } from "@/server/auth/throttle";
import { sessionCookieOptions, SESSION_COOKIE } from "@/server/auth/token";

function back(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL("/teacher-login?error=" + error, request.url), 303);
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || email.length > 320 || !password || password.length > 512) return back(request, "invalid");

    const identity = await authenticateTeacher(email, password);
    if (!identity) return back(request, "invalid");

    const { token, expiresAt } = await createTeacherSession(identity);
    const response = NextResponse.redirect(new URL("/teacher", request.url), 303);
    response.cookies.set({ name: SESSION_COOKIE, value: token, ...sessionCookieOptions(expiresAt) });
    return response;
  } catch (error) {
    if (error instanceof AuthRateLimitedError) return back(request, "locked");
    return back(request, "invalid");
  }
}
