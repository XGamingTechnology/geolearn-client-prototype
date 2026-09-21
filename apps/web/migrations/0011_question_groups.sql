-- GeoLearn migration 0011: reusable authoring-level stimulus/question groups.
-- Published QuestionVersions remain authoritative immutable stimulus snapshots.

CREATE TABLE question_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE RESTRICT,
  owner_teacher_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  scope text NOT NULL CHECK (scope IN ('SYSTEM','SCHOOL','PRIVATE')),
  title text NOT NULL,
  description text,
  subject text,
  topic text,
  stimulus_type text NOT NULL CHECK (stimulus_type IN ('text','image','video','webgis')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope='SYSTEM' AND school_id IS NULL)
    OR (scope='SCHOOL' AND school_id IS NOT NULL)
    OR (scope='PRIVATE' AND school_id IS NOT NULL AND owner_teacher_id IS NOT NULL)
  )
);

ALTER TABLE questions
  ADD COLUMN question_group_id uuid REFERENCES question_groups(id) ON DELETE SET NULL;

CREATE INDEX question_groups_school_scope_idx ON question_groups (school_id, scope, status);
CREATE INDEX question_groups_owner_idx ON question_groups (owner_teacher_id, status);
CREATE INDEX questions_group_idx ON questions (question_group_id, status);
