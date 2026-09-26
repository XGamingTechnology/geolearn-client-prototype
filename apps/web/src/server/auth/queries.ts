import { query } from "@/server/db";
import { verifySecret } from "./password";
import { assertLoginAllowed, clearLoginFailures, recordLoginFailure, throttleKey } from "./throttle";

export type TeacherIdentity = {
  staffUserId: string;
  schoolId: string | null;
  email: string;
  role: "SYSTEM_ADMIN" | "SCHOOL_ADMIN" | "TEACHER";
  displayName: string;
  schoolName: string | null;
  credentialVersion: number;
};

export type StudentIdentity = {
  studentId: string;
  schoolId: string;
  enrollmentId: string;
  classId: string;
  classCode: string;
  className: string;
  loginId: string;
  fullName: string;
  credentialVersion: number;
};

type TeacherAuthRow = TeacherIdentity & { passwordHash: string };
type StudentAuthRow = StudentIdentity & { pinHash: string };

export async function authenticateTeacher(emailInput: string, password: string): Promise<TeacherIdentity | null> {
  const email = emailInput.trim().toLowerCase();
  const key = throttleKey("teacher", email);
  await assertLoginAllowed(key);

  const [row] = await query<TeacherAuthRow>(
    `select
       su.id as "staffUserId",
       su.school_id as "schoolId",
       su.email,
       su.password_hash as "passwordHash",
       su.role,
       coalesce(tp.display_name, su.email) as "displayName",
       sc.name as "schoolName",
       su.credential_version as "credentialVersion"
     from staff_users su
     left join teacher_profiles tp on tp.staff_user_id = su.id
     left join schools sc on sc.id = su.school_id
     where lower(su.email) = $1
       and su.status = 'ACTIVE'
       and (su.school_id is null or sc.status = 'ACTIVE')
     limit 1`,
    [email],
  );

  if (!row || !(await verifySecret(password, row.passwordHash))) {
    await recordLoginFailure(key);
    return null;
  }

  await clearLoginFailures(key);
  await query("update staff_users set last_login_at = now(), updated_at = now() where id = $1", [row.staffUserId]);
  const { passwordHash: _passwordHash, ...identity } = row;
  void _passwordHash;
  return identity;
}

export async function authenticateStudent(classCodeInput: string, loginIdInput: string, pin: string): Promise<StudentIdentity | null> {
  const classCode = classCodeInput.trim().toLowerCase();
  const loginId = loginIdInput.trim().toLowerCase();
  const key = throttleKey("student", classCode + ":" + loginId);
  await assertLoginAllowed(key);

  const [row] = await query<StudentAuthRow>(
    `select
       s.id as "studentId",
       s.school_id as "schoolId",
       e.id as "enrollmentId",
       c.id as "classId",
       c.class_code as "classCode",
       c.name as "className",
       cred.login_id as "loginId",
       cred.pin_hash as "pinHash",
       s.full_name as "fullName",
       cred.credential_version as "credentialVersion"
     from classes c
     join schools sc on sc.id = c.school_id and sc.status = 'ACTIVE'
     join enrollments e on e.class_id = c.id and e.school_id = c.school_id and e.status = 'ACTIVE'
     join students s on s.id = e.student_id and s.school_id = c.school_id and s.status = 'ACTIVE'
     join student_credentials cred on cred.student_id = s.id and cred.school_id = c.school_id and cred.status = 'ACTIVE'
     where lower(c.class_code) = $1
       and lower(cred.login_id) = $2
       and c.status = 'ACTIVE'
     limit 1`,
    [classCode, loginId],
  );

  if (!row || !(await verifySecret(pin, row.pinHash))) {
    await recordLoginFailure(key);
    return null;
  }

  await clearLoginFailures(key);
  await query("update student_credentials set last_login_at = now(), updated_at = now() where student_id = $1", [row.studentId]);
  const { pinHash: _pinHash, ...identity } = row;
  void _pinHash;
  return identity;
}
