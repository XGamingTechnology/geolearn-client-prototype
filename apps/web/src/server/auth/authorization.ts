import type { TeacherSession } from "./session";

export class AuthorizationError extends Error {
  constructor() {
    super("Access denied");
    this.name = "AuthorizationError";
  }
}

export function assertTeacherSchool(session: TeacherSession, resourceSchoolId: string): void {
  if (session.role === "SYSTEM_ADMIN") return;
  if (!session.schoolId || session.schoolId !== resourceSchoolId) throw new AuthorizationError();
}

export function canManageSchool(session: TeacherSession, resourceSchoolId: string): boolean {
  if (session.role === "SYSTEM_ADMIN") return true;
  return session.schoolId === resourceSchoolId && (session.role === "SCHOOL_ADMIN" || session.role === "TEACHER");
}
