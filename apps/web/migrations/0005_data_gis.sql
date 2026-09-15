-- GeoLearn migration 0005: Data Bank and GIS Studio foundation.

CREATE TABLE datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE RESTRICT,
  owner_teacher_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  scope text NOT NULL CHECK (scope IN ('SYSTEM','SCHOOL','PRIVATE')),
  title text NOT NULL,
  description text,
  data_kind text NOT NULL CHECK (data_kind IN ('VECTOR','RASTER','TABLE')),
  source_type text NOT NULL CHECK (source_type IN ('UPLOAD','DIGITIZED','GENERATED','SYSTEM')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  forked_from_dataset_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope='SYSTEM' AND school_id IS NULL)
    OR (scope='SCHOOL' AND school_id IS NOT NULL)
    OR (scope='PRIVATE' AND school_id IS NOT NULL AND owner_teacher_id IS NOT NULL)
  )
);

CREATE TABLE dataset_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  format text NOT NULL,
  srid integer NOT NULL DEFAULT 4326 CHECK (srid > 0),
  geometry_type text,
  bbox jsonb,
  feature_count integer CHECK (feature_count IS NULL OR feature_count >= 0),
  schema_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_style_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_key text,
  processing_status text NOT NULL DEFAULT 'DRAFT' CHECK (processing_status IN ('DRAFT','READY','FAILED')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  created_by uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE(dataset_id, version_number),
  CHECK ((status='DRAFT' AND published_at IS NULL) OR (status='PUBLISHED' AND published_at IS NOT NULL))
);

ALTER TABLE datasets
  ADD CONSTRAINT datasets_fork_source_fk
  FOREIGN KEY (forked_from_dataset_version_id) REFERENCES dataset_versions(id) ON DELETE SET NULL;

CREATE TABLE dataset_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id uuid NOT NULL REFERENCES dataset_versions(id) ON DELETE CASCADE,
  source_feature_id text,
  geom geometry(Geometry,4326) NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX datasets_school_scope_idx ON datasets (school_id, scope, status);
CREATE INDEX datasets_owner_idx ON datasets (owner_teacher_id, status);
CREATE INDEX dataset_versions_dataset_idx ON dataset_versions (dataset_id, status, version_number DESC);
CREATE INDEX dataset_features_version_idx ON dataset_features (dataset_version_id);
CREATE INDEX dataset_features_geom_gist ON dataset_features USING GIST (geom);

CREATE TRIGGER dataset_versions_immutable
BEFORE UPDATE OR DELETE ON dataset_versions
FOR EACH ROW EXECUTE FUNCTION geolearn_prevent_published_version_mutation();

CREATE TABLE gis_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  owner_teacher_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  map_view jsonb NOT NULL DEFAULT '{"center":[-2.5,118],"zoom":5}'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gis_projects_owner_idx ON gis_projects (owner_teacher_id, status, updated_at DESC);

CREATE TABLE gis_project_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES gis_projects(id) ON DELETE CASCADE,
  dataset_version_id uuid NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  position integer NOT NULL DEFAULT 1 CHECK (position > 0),
  visible boolean NOT NULL DEFAULT true,
  opacity numeric(4,3) NOT NULL DEFAULT 1 CHECK (opacity >= 0 AND opacity <= 1),
  style_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  alias text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, dataset_version_id)
);
CREATE INDEX gis_project_layers_project_idx ON gis_project_layers (project_id, position);

CREATE TABLE gis_analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES gis_projects(id) ON DELETE CASCADE,
  actor_staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  tool_id text NOT NULL CHECK (tool_id IN ('buffer','overlay','distance')),
  parameters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_dataset_version_id uuid REFERENCES dataset_versions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gis_analysis_runs_project_idx ON gis_analysis_runs (project_id, created_at DESC);
