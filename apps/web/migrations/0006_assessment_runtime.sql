-- GeoLearn migration 0006: quiz, assignment, attempt and assessment persistence.

CREATE TABLE quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE RESTRICT,
  owner_teacher_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  scope text NOT NULL CHECK (scope IN ('SYSTEM','SCHOOL','PRIVATE')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope='SYSTEM' AND school_id IS NULL)
    OR (scope='SCHOOL' AND school_id IS NOT NULL)
    OR (scope='PRIVATE' AND school_id IS NOT NULL AND owner_teacher_id IS NOT NULL)
  )
);

CREATE TABLE quiz_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  created_by uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (quiz_id, version_number),
  CHECK ((status='DRAFT' AND published_at IS NULL) OR (status='PUBLISHED' AND published_at IS NOT NULL))
);

CREATE TABLE quiz_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_version_id uuid NOT NULL REFERENCES quiz_versions(id) ON DELETE CASCADE,
  question_version_id uuid NOT NULL REFERENCES question_versions(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position > 0),
  points numeric(10,2) NOT NULL DEFAULT 1 CHECK (points > 0),
  section_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (quiz_version_id, position),
  UNIQUE (quiz_version_id, question_version_id)
);

CREATE INDEX quizzes_school_scope_idx ON quizzes (school_id, scope, status);
CREATE INDEX quiz_versions_quiz_idx ON quiz_versions (quiz_id, status, version_number DESC);
CREATE INDEX quiz_items_version_position_idx ON quiz_items (quiz_version_id, position);

CREATE TRIGGER quiz_versions_immutable
BEFORE UPDATE OR DELETE ON quiz_versions
FOR EACH ROW EXECUTE FUNCTION geolearn_prevent_published_version_mutation();

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  quiz_version_id uuid NOT NULL REFERENCES quiz_versions(id) ON DELETE RESTRICT,
  title text NOT NULL,
  instructions text,
  opens_at timestamptz,
  closes_at timestamptz,
  attempt_limit integer NOT NULL DEFAULT 1 CHECK (attempt_limit > 0 AND attempt_limit <= 10),
  result_visibility text NOT NULL DEFAULT 'AFTER_SUBMIT' CHECK (result_visibility IN ('AFTER_SUBMIT','AFTER_CLOSE','HIDDEN')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','CLOSED','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (closes_at IS NULL OR opens_at IS NULL OR closes_at > opens_at)
);
CREATE INDEX assignments_class_status_idx ON assignments (class_id, status, opens_at, closes_at);
CREATE INDEX assignments_teacher_idx ON assignments (teacher_id, created_at DESC);
CREATE INDEX assignments_quiz_version_idx ON assignments (quiz_version_id);

CREATE TABLE attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE RESTRICT,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  quiz_version_id uuid NOT NULL REFERENCES quiz_versions(id) ON DELETE RESTRICT,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','SUBMITTED','ABANDONED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score_raw numeric(12,2),
  score_max numeric(12,2),
  UNIQUE (assignment_id, student_id, attempt_number),
  CHECK ((status='SUBMITTED' AND submitted_at IS NOT NULL) OR (status<>'SUBMITTED'))
);
CREATE INDEX attempts_assignment_student_idx ON attempts (assignment_id, student_id, status);
CREATE INDEX attempts_enrollment_idx ON attempts (enrollment_id, started_at DESC);

CREATE TABLE responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  quiz_item_id uuid NOT NULL REFERENCES quiz_items(id) ON DELETE RESTRICT,
  question_version_id uuid NOT NULL REFERENCES question_versions(id) ON DELETE RESTRICT,
  response_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_correct boolean,
  score_awarded numeric(12,2),
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, quiz_item_id)
);
CREATE INDEX responses_attempt_idx ON responses (attempt_id, answered_at);
CREATE INDEX responses_question_version_idx ON responses (question_version_id);

CREATE TABLE response_spatial_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  artifact_type text NOT NULL CHECK (artifact_type IN ('POINT','LINE','POLYGON','SELECTION')),
  geom geometry(Geometry,4326),
  selected_feature_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (artifact_type='SELECTION')
    OR (artifact_type<>'SELECTION' AND geom IS NOT NULL)
  )
);
CREATE INDEX response_spatial_artifacts_response_idx ON response_spatial_artifacts (response_id);
CREATE INDEX response_spatial_artifacts_geom_gist ON response_spatial_artifacts USING GIST (geom);

CREATE TABLE gis_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  response_id uuid REFERENCES responses(id) ON DELETE CASCADE,
  question_version_id uuid NOT NULL REFERENCES question_versions(id) ON DELETE RESTRICT,
  tool_id text NOT NULL,
  action_type text NOT NULL,
  parameters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gis_activities_attempt_idx ON gis_activities (attempt_id, occurred_at);
CREATE INDEX gis_activities_question_idx ON gis_activities (question_version_id, occurred_at);
