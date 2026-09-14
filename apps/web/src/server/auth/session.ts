import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/server/db";
import type { StudentIdentity, TeacherIdentity } from "./queries";
import { createOpaqueSessionToken, hashSessionToken, SESSION_COOKIE } from "./token";

const TEACHER_SESSION_HOURS = 8;
const STUDENT_SESSION_HOURS = 12;

export type TeacherSession = TeacherIdentity & { kind: "teacher"; sessionId: string };
export type StudentSession = StudentIdentity & { kind: "student"; sessionId: string };
export type AuthSession = TeacherSession | StudentSession;

export async function createTeacherSession(identity: TeacherIdentity) {
  return createSession("STAFF", identity, TEACHER_SESSION_HOURS);
}

export async function createStudentSession(identity: StudentIdentity) {
  return createSession("STUDENT", identity, STUDENT_SESSION_HOURS);
}

async function createSession(
  principalType: "STAFF" | "STUDENT",
  identity: TeacherIdentity | StudentIdentity,
  hours: number,
): Promise<{ token: string; expiresAt: Date }> {
  const token = createOpaqueSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  if (principalType === "STAFF") {
    const teacher = identity as TeacherIdentity;
    await query(
      `insert into auth_sessions(token_hash, principal_type, school_id, staff_user_id, credential_version, expires_at)
       values ($1, 'STAFF', $2, $3, $4, $5)`,
      [tokenHash, teacher.schoolId, teacher.staffUserId, teacher.credentialVersion, expiresAt],
    );
  } else {
    const student = identity as StudentIdentity;
    await query(
      `insert into auth_sessions(token_hash, principal_type, school_id, student_id, enrollment_id, credential_version, expires_at)
       values ($1, 'STUDENT', $2, $3, $4, $5, $6)`,
      [tokenHash, student.schoolId, student.studentId, student.enrollmentId, student.credentialVersion, expiresAt],
    );
  }
  return { token, expiresAt };
}

export async function revokeSessionToken(token: string | undefined): Promise<void> {
  if (!token) return;
  await query(
    "update auth_sessions set revoked_at = coalesce(revoked_at, now()) where token_hash = $1",
    [hashSessionToken(token)],
  );
}

export async function currentSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? loadSessionByToken(token) : null;
}

export async function loadSessionByToken(token: string): Promise<AuthSession | null> {
  const [base] = await query<{
    id: string;
    principal_type: "STAFF" | "STUDENT";
    staff_user_id: string | null;
    student_id: string | null;
    enrollment_id: string | null;
    credential_version: number;
  }>(
    `select id, principal_type, staff_user_id, student_id, enrollment_id, credential_version
     from auth_sessions
     where token_hash = $1 and revoked_at is null and expires_at > now()
     limit 1`,
    [hashSessionToken(token)],
  );
  if (!base) return null;

  if (base.principal_type === "STAFF" && base.staff_user_id) {
    const [row] = await query<TeacherIdentity>(
      `select
         su.id as "staffUserId",
         su.school_id as "schoolId",
         su.email,
         su.role,
         coalesce(tp.display_name, su.email) as "displayName",
         sc.name as "schoolName",
         su.credential_version as "credentialVersion"
       from staff_users su
       left join teacher_profiles tp on tp.staff_user_id = su.id
       left join schools sc on sc.id = su.school_id
       where su.id = $1
         and su.status = 'ACTIVE'
         and su.credential_version = $2
         and (su.school_id is null or sc.status = 'ACTIVE')`,
      [base.staff_user_id, base.credential_version],
    );
    return row ? { kind: "teacher", sessionId: base.id, ...row } : null;
  }

  if (base.principal_type === "STUDENT" && base.student_id && base.enrollment_id) {
    const [row] = await query<StudentIdentity>(
      `select
         s.id as "studentId",
         s.school_id as "schoolId",
         e.id as "enrollmentId",
         c.id as "classId",
         c.class_code as "classCode",
         c.name as "className",
         cred.login_id as "loginId",
         s.full_name as "fullName",
         cred.credential_version as "credentialVersion"
       from enrollments e
       join classes c on c.id = e.class_id and c.school_id = e.school_id and c.status = 'ACTIVE'
       join schools sc on sc.id = e.school_id and sc.status = 'ACTIVE'
       join students s on s.id = e.student_id and s.school_id = e.school_id and s.status = 'ACTIVE'
       join student_credentials cred on cred.student_id = s.id and cred.school_id = e.school_id and cred.status = 'ACTIVE'
       where e.id = $1
         and e.student_id = $2
         and e.status = 'ACTIVE'
         and cred.credential_version = $3`,
      [base.enrollment_id, base.student_id, base.credential_version],
    );
    return row ? { kind: "student", sessionId: base.id, ...row } : null;
  }

  return null;
}

export async function requireTeacherSession(): Promise<TeacherSession> {
  const session = await currentSession();
  if (!session || session.kind !== "teacher") redirect("/teacher-login");
  return session;
}

export async function requireStudentSession(): Promise<StudentSession> {
  const session = await currentSession();
  if (!session || session.kind !== "student") redirect("/student-login");
  return session;
}
