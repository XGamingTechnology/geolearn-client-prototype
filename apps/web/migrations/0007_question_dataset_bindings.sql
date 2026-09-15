-- GeoLearn migration 0007: bind immutable DatasetVersions to QuestionVersions.

CREATE TABLE question_version_dataset_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
  dataset_version_id uuid NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT 'CONTEXT' CHECK (role IN ('SOURCE','TARGET','CONTEXT')),
  position integer NOT NULL DEFAULT 1 CHECK (position > 0),
  visible boolean NOT NULL DEFAULT true,
  opacity numeric(4,3) NOT NULL DEFAULT 1 CHECK (opacity >= 0 AND opacity <= 1),
  style_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  alias text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_version_id, dataset_version_id),
  UNIQUE (question_version_id, position)
);

CREATE INDEX question_version_dataset_layers_question_idx
  ON question_version_dataset_layers (question_version_id, position);
CREATE INDEX question_version_dataset_layers_dataset_idx
  ON question_version_dataset_layers (dataset_version_id);

CREATE OR REPLACE FUNCTION geolearn_guard_question_version_child_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  parent_id uuid;
  parent_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    parent_id := OLD.question_version_id;
  ELSE
    parent_id := NEW.question_version_id;
  END IF;

  SELECT status INTO parent_status
  FROM question_versions
  WHERE id = parent_id;

  IF parent_status = 'PUBLISHED' THEN
    RAISE EXCEPTION 'Published QuestionVersion bindings are immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER question_version_dataset_layers_immutable
BEFORE INSERT OR UPDATE OR DELETE ON question_version_dataset_layers
FOR EACH ROW EXECUTE FUNCTION geolearn_guard_question_version_child_mutation();
