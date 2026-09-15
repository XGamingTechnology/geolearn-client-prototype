-- GeoLearn migration 0008: immutable QuestionVersion media bindings.

CREATE TABLE question_version_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
  media_asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT 'STIMULUS' CHECK (role IN ('STIMULUS','SUPPORTING')),
  position integer NOT NULL DEFAULT 1 CHECK (position > 0),
  alt_text text,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(question_version_id, media_asset_id),
  UNIQUE(question_version_id, position)
);

CREATE INDEX question_version_media_assets_question_idx
  ON question_version_media_assets(question_version_id, position);
CREATE INDEX question_version_media_assets_media_idx
  ON question_version_media_assets(media_asset_id);

CREATE OR REPLACE FUNCTION geolearn_guard_question_media_binding_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  parent_id uuid;
  parent_status text;
BEGIN
  parent_id := CASE WHEN TG_OP='DELETE' THEN OLD.question_version_id ELSE NEW.question_version_id END;

  SELECT status INTO parent_status
  FROM question_versions
  WHERE id=parent_id;

  IF parent_status='PUBLISHED' THEN
    RAISE EXCEPTION 'Published QuestionVersion media bindings are immutable';
  END IF;

  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER question_version_media_assets_immutable
BEFORE INSERT OR UPDATE OR DELETE ON question_version_media_assets
FOR EACH ROW EXECUTE FUNCTION geolearn_guard_question_media_binding_mutation();
