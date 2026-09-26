-- GeoLearn migration 0002: identity, tenancy, and authentication foundation.
-- This slice intentionally includes the minimal Class/Enrollment records required to
-- resolve the approved student login contract: Class Code + Student ID + PIN.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX schools_code_lower_uq ON schools ((lower(code)));

CREATE TABLE staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE RESTRICT,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('SYSTEM_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  credential_version integer NOT NULL DEFAULT 1 CHECK (credential_version > 0),
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, school_id),
  CHECK (
    (role = 'SYSTEM_ADMIN' AND school_id IS NULL)
    OR (role IN ('SCHOOL_ADMIN', 'TEACHER') AND school_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX staff_users_email_lower_uq ON staff_users ((lower(email)));
CREATE INDEX staff_users_school_idx ON staff_users (school_id);

CREATE TABLE teacher_profiles (
  staff_user_id uuid PRIMARY KEY REFERENCES staff_users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  employee_ref text,
  subject text,
  avatar_url text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  student_number text NOT NULL,
  full_name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED', 'ARCHIVED')),
  cohort_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, school_id)
);
CREATE UNIQUE INDEX students_school_number_lower_uq ON students (school_id, (lower(student_number)));
CREATE INDEX students_school_idx ON students (school_id);

CREATE TABLE student_credentials (
  student_id uuid PRIMARY KEY,
  school_id uuid NOT NULL,
  login_id text NOT NULL,
  pin_hash text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  must_change_pin boolean NOT NULL DEFAULT false,
  credential_version integer NOT NULL DEFAULT 1 CHECK (credential_version > 0),
  last_reset_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX student_credentials_school_login_lower_uq
  ON student_credentials (school_id, (lower(login_id)));

CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  grade_level text,
  academic_year text,
  semester text,
  class_code text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, school_id),
  FOREIGN KEY (teacher_id, school_id) REFERENCES staff_users(id, school_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX classes_code_lower_uq ON classes ((lower(class_code)));
CREATE INDEX classes_school_idx ON classes (school_id);
CREATE INDEX classes_teacher_idx ON classes (teacher_id);

CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id),
  UNIQUE (id, school_id),
  FOREIGN KEY (class_id, school_id) REFERENCES classes(id, school_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE CASCADE
);
CREATE INDEX enrollments_student_idx ON enrollments (student_id);
CREATE INDEX enrollments_class_status_idx ON enrollments (class_id, status);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash char(64) NOT NULL UNIQUE,
  principal_type text NOT NULL CHECK (principal_type IN ('STAFF', 'STUDENT')),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  staff_user_id uuid REFERENCES staff_users(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE CASCADE,
  credential_version integer NOT NULL CHECK (credential_version > 0),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (principal_type = 'STAFF' AND staff_user_id IS NOT NULL AND student_id IS NULL AND enrollment_id IS NULL)
    OR
    (principal_type = 'STUDENT' AND staff_user_id IS NULL AND student_id IS NOT NULL AND enrollment_id IS NOT NULL AND school_id IS NOT NULL)
  )
);
CREATE INDEX auth_sessions_staff_idx ON auth_sessions (staff_user_id, expires_at);
CREATE INDEX auth_sessions_student_idx ON auth_sessions (student_id, expires_at);
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions (expires_at) WHERE revoked_at IS NULL;

-- Login throttling stores only a SHA-256 key, never the supplied email/class/student ID.
CREATE TABLE auth_login_throttles (
  key_hash char(64) PRIMARY KEY,
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
