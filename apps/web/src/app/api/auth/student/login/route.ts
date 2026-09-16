import { NextRequest, NextResponse } from "next/server";
import { authenticateStudent } from "@/server/auth/queries";
import { createStudentSession } from "@/server/auth/session";
import { AuthRateLimitedError } from "@/server/auth/throttle";
import { sessionCookieOptions, SESSION_COOKIE } from "@/server/auth/token";
import { publicRedirectUrl } from "@/server/http/public-url";

function back(request: NextRequest, error: string) {
  return NextResponse.redirect(publicRedirectUrl(request,"/student-login?error=" + error), 303);
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const classCode = String(form.get("classCode") ?? "").trim();
    const loginId = String(form.get("loginId") ?? "").trim();
    const pin = String(form.get("pin") ?? "");
    if (!classCode || classCode.length > 64 || !loginId || loginId.length > 128 || !/^\d{4,12}$/.test(pin)) {
      return back(request, "invalid");
    }

    const identity = await authenticateStudent(classCode, loginId, pin);
    if (!identity) return back(request, "invalid");

    const { token, expiresAt } = await createStudentSession(identity);
    const response = NextResponse.redirect(publicRedirectUrl(request,"/student"), 303);
    response.cookies.set({ name: SESSION_COOKIE, value: token, ...sessionCookieOptions(expiresAt) });
    return response;
  } catch (error) {
    if (error instanceof AuthRateLimitedError) return back(request, "locked");
    return back(request, "invalid");
  }
}
