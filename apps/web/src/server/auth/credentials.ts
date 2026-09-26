import { query } from "@/server/db";
import { hashPassword, hashPin } from "./password";

export async function resetTeacherPassword(staffUserId: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  const rows = await query<{ id: string }>(
    `update staff_users
     set password_hash = $2, credential_version = credential_version + 1,
         password_changed_at = now(), updated_at = now()
     where id = $1
     returning id`,
    [staffUserId, passwordHash],
  );
  if (!rows[0]) throw new Error("Staff user not found");
  await query("update auth_sessions set revoked_at = coalesce(revoked_at, now()) where staff_user_id = $1", [staffUserId]);
}

export async function setTeacherCredentialEnabled(staffUserId: string, enabled: boolean): Promise<void> {
  const rows = await query<{ id: string }>(
    `update staff_users
     set status = $2, credential_version = credential_version + 1, updated_at = now()
     where id = $1
     returning id`,
    [staffUserId, enabled ? "ACTIVE" : "DISABLED"],
  );
  if (!rows[0]) throw new Error("Staff user not found");
  await query("update auth_sessions set revoked_at = coalesce(revoked_at, now()) where staff_user_id = $1", [staffUserId]);
}

export async function resetStudentPin(studentId: string, pin: string, mustChangePin = true): Promise<void> {
  const pinHash = await hashPin(pin);
  const rows = await query<{ student_id: string }>(
    `update student_credentials
     set pin_hash = $2, credential_version = credential_version + 1,
         must_change_pin = $3, last_reset_at = now(), updated_at = now()
     where student_id = $1
     returning student_id`,
    [studentId, pinHash, mustChangePin],
  );
  if (!rows[0]) throw new Error("Student credential not found");
  await query("update auth_sessions set revoked_at = coalesce(revoked_at, now()) where student_id = $1", [studentId]);
}

export async function setStudentCredentialEnabled(studentId: string, enabled: boolean): Promise<void> {
  const rows = await query<{ student_id: string }>(
    `update student_credentials
     set status = $2, credential_version = credential_version + 1, updated_at = now()
     where student_id = $1
     returning student_id`,
    [studentId, enabled ? "ACTIVE" : "DISABLED"],
  );
  if (!rows[0]) throw new Error("Student credential not found");
  await query("update auth_sessions set revoked_at = coalesce(revoked_at, now()) where student_id = $1", [studentId]);
}
