import { query } from "@/server/db";
import type { TeacherSession } from "./session";
import { AuthorizationError } from "./authorization";

export const STAFF_PERMISSIONS = [
  "ACCOUNT_MANAGE",
  "STUDENT_CREDENTIAL_MANAGE",
  "CLASS_MANAGE_ALL",
  "CONTENT_MANAGE_SCHOOL",
  "RESULTS_VIEW_ALL",
  "SCHOOL_SETTINGS",
] as const;

export type StaffPermission = typeof STAFF_PERMISSIONS[number];

export async function getStaffPermissions(staffUserId: string): Promise<StaffPermission[]> {
  const rows = await query<{ permission_code: StaffPermission }>(
    "select permission_code from staff_user_permissions where staff_user_id = $1 order by permission_code",
    [staffUserId],
  );
  return rows.map((row) => row.permission_code);
}

export async function hasStaffPermission(session: TeacherSession, permission: StaffPermission): Promise<boolean> {
  if (session.role === "SYSTEM_ADMIN" || session.role === "SCHOOL_ADMIN") return true;
  const permissions = await getStaffPermissions(session.staffUserId);
  return permissions.includes(permission);
}

export async function requireStaffPermission(session: TeacherSession, permission: StaffPermission): Promise<void> {
  if (!(await hasStaffPermission(session, permission))) throw new AuthorizationError();
}
