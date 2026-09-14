import { randomBytes, scrypt } from "node:crypto";
import pg from "pg";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const optional = (name) => process.env[name]?.trim() || null;
const shouldRotate = process.env.BOOTSTRAP_ROTATE_CREDENTIALS === "true";

function derive(secret, salt) {
  return new Promise((resolve, reject) => {
    scrypt(secret, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
  });
}

async function hashSecret(secret) {
  const salt = randomBytes(16);
  const key = await derive(secret, salt);
  return ["scrypt", 16384, 8, 1, salt.toString("base64url"), key.toString("base64url")].join("$");
}

const databaseUrl = required("DATABASE_URL");
const schoolName = required("BOOTSTRAP_SCHOOL_NAME");
const schoolCode = required("BOOTSTRAP_SCHOOL_CODE");
const teacherEmail = required("BOOTSTRAP_TEACHER_EMAIL").toLowerCase();
const teacherPassword = required("BOOTSTRAP_TEACHER_PASSWORD");
if (teacherPassword.length < 12 || teacherPassword.length > 512) throw new Error("BOOTSTRAP_TEACHER_PASSWORD must be 12-512 characters");
const teacherName = optional("BOOTSTRAP_TEACHER_NAME") ?? teacherEmail;

const className = optional("BOOTSTRAP_CLASS_NAME");
const classCode = optional("BOOTSTRAP_CLASS_CODE");
const studentLoginId = optional("BOOTSTRAP_STUDENT_ID");
const studentName = optional("BOOTSTRAP_STUDENT_NAME");
const studentPin = optional("BOOTSTRAP_STUDENT_PIN");
const studentFields = [className, classCode, studentLoginId, studentName, studentPin];
if (studentFields.some(Boolean) && !studentFields.every(Boolean)) {
  throw new Error("Student bootstrap requires BOOTSTRAP_CLASS_NAME, BOOTSTRAP_CLASS_CODE, BOOTSTRAP_STUDENT_ID, BOOTSTRAP_STUDENT_NAME, and BOOTSTRAP_STUDENT_PIN together");
}
if (studentPin && !/^\d{4,12}$/.test(studentPin)) throw new Error("BOOTSTRAP_STUDENT_PIN must contain 4-12 digits");

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query("begin");

  const schoolResult = await client.query(
    `insert into schools(name, code, status)
     values ($1, $2, 'ACTIVE')
     on conflict ((lower(code))) do update set name = excluded.name, status = 'ACTIVE', updated_at = now()
     returning id`,
    [schoolName, schoolCode],
  );
  const schoolId = schoolResult.rows[0].id;

  const existingTeacher = await client.query(
    "select id from staff_users where lower(email) = lower($1) limit 1",
    [teacherEmail],
  );

  let teacherId;
  if (!existingTeacher.rows[0]) {
    const teacherHash = await hashSecret(teacherPassword);
    const createdTeacher = await client.query(
      `insert into staff_users(school_id, email, password_hash, role, status)
       values ($1, $2, $3, 'TEACHER', 'ACTIVE')
       returning id`,
      [schoolId, teacherEmail, teacherHash],
    );
    teacherId = createdTeacher.rows[0].id;
  } else {
    teacherId = existingTeacher.rows[0].id;
    if (shouldRotate) {
      const teacherHash = await hashSecret(teacherPassword);
      await client.query(
        `update staff_users
         set school_id = $2, password_hash = $3, role = 'TEACHER', status = 'ACTIVE',
             credential_version = credential_version + 1, password_changed_at = now(), updated_at = now()
         where id = $1`,
        [teacherId, schoolId, teacherHash],
      );
      await client.query("update auth_sessions set revoked_at = coalesce(revoked_at, now()) where staff_user_id = $1", [teacherId]);
    }
  }

  await client.query(
    `insert into teacher_profiles(staff_user_id, display_name, subject)
     values ($1, $2, 'Geografi')
     on conflict (staff_user_id) do update set display_name = excluded.display_name, updated_at = now()`,
    [teacherId, teacherName],
  );

  let summary = { schoolCode, teacherEmail, classCode: null, studentId: null };

  if (className && classCode && studentLoginId && studentName && studentPin) {
    const classResult = await client.query(
      `insert into classes(school_id, teacher_id, name, grade_level, academic_year, semester, class_code, status)
       values ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
       on conflict ((lower(class_code))) do update
       set teacher_id = excluded.teacher_id, name = excluded.name, grade_level = excluded.grade_level,
           academic_year = excluded.academic_year, semester = excluded.semester, status = 'ACTIVE', updated_at = now()
       returning id`,
      [schoolId, teacherId, className, optional("BOOTSTRAP_GRADE_LEVEL"), optional("BOOTSTRAP_ACADEMIC_YEAR"), optional("BOOTSTRAP_SEMESTER"), classCode],
    );
    const classId = classResult.rows[0].id;

    const studentResult = await client.query(
      `insert into students(school_id, student_number, full_name, status)
       values ($1, $2, $3, 'ACTIVE')
       on conflict (school_id, (lower(student_number))) do update
       set full_name = excluded.full_name, status = 'ACTIVE', updated_at = now()
       returning id`,
      [schoolId, studentLoginId, studentName],
    );
    const studentId = studentResult.rows[0].id;

    const existingCredential = await client.query("select student_id from student_credentials where student_id = $1", [studentId]);
    if (!existingCredential.rows[0]) {
      const pinHash = await hashSecret(studentPin);
      await client.query(
        `insert into student_credentials(student_id, school_id, login_id, pin_hash, status, must_change_pin)
         values ($1, $2, $3, $4, 'ACTIVE', false)`,
        [studentId, schoolId, studentLoginId, pinHash],
      );
    } else if (shouldRotate) {
      const pinHash = await hashSecret(studentPin);
      await client.query(
        `update student_credentials
         set school_id = $2, login_id = $3, pin_hash = $4, status = 'ACTIVE',
             must_change_pin = false, credential_version = credential_version + 1,
             last_reset_at = now(), updated_at = now()
         where student_id = $1`,
        [studentId, schoolId, studentLoginId, pinHash],
      );
      await client.query("update auth_sessions set revoked_at = coalesce(revoked_at, now()) where student_id = $1", [studentId]);
    }

    await client.query(
      `insert into enrollments(school_id, class_id, student_id, status)
       values ($1, $2, $3, 'ACTIVE')
       on conflict (class_id, student_id) do update set status = 'ACTIVE', left_at = null, updated_at = now()`,
      [schoolId, classId, studentId],
    );

    summary = { schoolCode, teacherEmail, classCode, studentId: studentLoginId };
  }

  await client.query("commit");
  console.info("GeoLearn auth bootstrap complete:", summary);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
