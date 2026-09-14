import { describe, expect, it } from "vitest";
import { assertTeacherSchool, AuthorizationError, canManageSchool } from "./authorization";
import type { TeacherSession } from "./session";

function session(overrides: Partial<TeacherSession> = {}): TeacherSession {
  return {
    kind: "teacher",
    sessionId: "session",
    staffUserId: "staff",
    schoolId: "school-a",
    email: "teacher@example.com",
    role: "TEACHER",
    displayName: "Teacher",
    schoolName: "School A",
    credentialVersion: 1,
    ...overrides,
  };
}

describe("school authorization", () => {
  it("allows same-school teachers", () => {
    expect(() => assertTeacherSchool(session(), "school-a")).not.toThrow();
    expect(canManageSchool(session(), "school-a")).toBe(true);
  });

  it("blocks cross-school teachers", () => {
    expect(() => assertTeacherSchool(session(), "school-b")).toThrow(AuthorizationError);
    expect(canManageSchool(session(), "school-b")).toBe(false);
  });

  it("allows system admins across schools", () => {
    const admin = session({ role: "SYSTEM_ADMIN", schoolId: null });
    expect(() => assertTeacherSchool(admin, "school-b")).not.toThrow();
  });
});
