-- GeoLearn migration 0004: reusable content authoring foundation.

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE RESTRICT,
  owner_teacher_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  scope text NOT NULL CHECK (scope IN ('SYSTEM','SCHOOL','PRIVATE')),
  title text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('IMAGE','VIDEO','DOCUMENT','ILLUSTRATION')),
  storage_key text,
  mime_type text,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope='SYSTEM' AND school_id IS NULL)
    OR (scope='SCHOOL' AND school_id IS NOT NULL)
    OR (scope='PRIVATE' AND school_id IS NOT NULL AND owner_teacher_id IS NOT NULL)
  )
);
CREATE INDEX media_assets_school_idx ON media_assets (school_id, status);
CREATE INDEX media_assets_owner_idx ON media_assets (owner_teacher_id, status);

CREATE TABLE cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE RESTRICT,
  owner_teacher_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  scope text NOT NULL CHECK (scope IN ('SYSTEM','SCHOOL','PRIVATE')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  forked_from_case_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope='SYSTEM' AND school_id IS NULL)
    OR (scope='SCHOOL' AND school_id IS NOT NULL)
    OR (scope='PRIVATE' AND school_id IS NOT NULL AND owner_teacher_id IS NOT NULL)
  )
);

CREATE TABLE case_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  narrative text,
  map_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  stimulus_layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (case_id, version_number),
  CHECK ((status='DRAFT' AND published_at IS NULL) OR (status='PUBLISHED' AND published_at IS NOT NULL))
);
ALTER TABLE cases
  ADD CONSTRAINT cases_fork_source_fk
  FOREIGN KEY (forked_from_case_version_id) REFERENCES case_versions(id) ON DELETE SET NULL;

CREATE TABLE case_version_media_assets (
  case_version_id uuid NOT NULL REFERENCES case_versions(id) ON DELETE CASCADE,
  media_asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  position integer NOT NULL DEFAULT 1 CHECK (position > 0),
  PRIMARY KEY (case_version_id, media_asset_id)
);

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE RESTRICT,
  owner_teacher_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  scope text NOT NULL CHECK (scope IN ('SYSTEM','SCHOOL','PRIVATE')),
  title text NOT NULL,
  subject text,
  topic text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  forked_from_question_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope='SYSTEM' AND school_id IS NULL)
    OR (scope='SCHOOL' AND school_id IS NOT NULL)
    OR (scope='PRIVATE' AND school_id IS NOT NULL AND owner_teacher_id IS NOT NULL)
  )
);

CREATE TABLE question_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  case_version_id uuid REFERENCES case_versions(id) ON DELETE SET NULL,
  spatial_mode text NOT NULL CHECK (spatial_mode IN ('location','condition','influence','region','hierarchy','analogy','pattern','association')),
  difficulty text,
  bloom_level text,
  prompt text NOT NULL,
  stimulus_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  activity_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  created_by uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (question_id, version_number),
  CHECK ((status='DRAFT' AND published_at IS NULL) OR (status='PUBLISHED' AND published_at IS NOT NULL))
);
ALTER TABLE questions
  ADD CONSTRAINT questions_fork_source_fk
  FOREIGN KEY (forked_from_question_version_id) REFERENCES question_versions(id) ON DELETE SET NULL;

CREATE INDEX questions_school_scope_idx ON questions (school_id, scope, status);
CREATE INDEX questions_owner_idx ON questions (owner_teacher_id, status);
CREATE INDEX question_versions_question_status_idx ON question_versions (question_id, status, version_number DESC);
CREATE INDEX cases_school_scope_idx ON cases (school_id, scope, status);
CREATE INDEX case_versions_case_status_idx ON case_versions (case_id, status, version_number DESC);

CREATE OR REPLACE FUNCTION geolearn_prevent_published_version_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'PUBLISHED' THEN
    RAISE EXCEPTION 'Published versions are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER question_versions_immutable
BEFORE UPDATE OR DELETE ON question_versions
FOR EACH ROW EXECUTE FUNCTION geolearn_prevent_published_version_mutation();

CREATE TRIGGER case_versions_immutable
BEFORE UPDATE OR DELETE ON case_versions
FOR EACH ROW EXECUTE FUNCTION geolearn_prevent_published_version_mutation();
