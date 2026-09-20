-- GeoLearn migration 0010: immutable dataset bindings for CaseVersion workspaces.

CREATE TABLE case_version_dataset_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_version_id uuid NOT NULL REFERENCES case_versions(id) ON DELETE CASCADE,
  dataset_version_id uuid NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT 'CONTEXT' CHECK (role IN ('CONTEXT','SOURCE','TARGET')),
  position integer NOT NULL DEFAULT 1 CHECK (position > 0),
  visible boolean NOT NULL DEFAULT true,
  opacity numeric(4,3) NOT NULL DEFAULT 1 CHECK (opacity >= 0 AND opacity <= 1),
  alias text,
  style_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_version_id, dataset_version_id)
);

CREATE INDEX case_version_dataset_layers_case_idx
  ON case_version_dataset_layers(case_version_id, position);

CREATE OR REPLACE FUNCTION geolearn_guard_case_layer_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  parent_id uuid;
  parent_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    parent_id := OLD.case_version_id;
  ELSE
    parent_id := NEW.case_version_id;
  END IF;

  SELECT status INTO parent_status FROM case_versions WHERE id = parent_id;
  IF parent_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'Published CaseVersion dataset bindings are immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER case_version_dataset_layers_immutable
BEFORE INSERT OR UPDATE OR DELETE ON case_version_dataset_layers
FOR EACH ROW EXECUTE FUNCTION geolearn_guard_case_layer_mutation();
