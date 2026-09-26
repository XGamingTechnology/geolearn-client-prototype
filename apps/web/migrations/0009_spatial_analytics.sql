-- GeoLearn migration 0009: recomputable Spatial Thinking analytics.

CREATE TABLE question_skill_weights (
  question_version_id uuid NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
  spatial_mode text NOT NULL CHECK (spatial_mode IN ('location','condition','influence','region','hierarchy','analogy','pattern','association')),
  weight numeric(6,3) NOT NULL CHECK (weight > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (question_version_id, spatial_mode)
);

CREATE TABLE spatial_skill_scores (
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  spatial_mode text NOT NULL CHECK (spatial_mode IN ('location','condition','influence','region','hierarchy','analogy','pattern','association')),
  score numeric(8,3) NOT NULL,
  answered_count integer NOT NULL DEFAULT 0 CHECK (answered_count >= 0),
  correct_count integer NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  source_attempt_count integer NOT NULL DEFAULT 0 CHECK (source_attempt_count >= 0),
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, spatial_mode)
);

CREATE INDEX spatial_skill_scores_school_mode_idx
  ON spatial_skill_scores(school_id, spatial_mode, score DESC);

CREATE OR REPLACE FUNCTION geolearn_seed_question_skill_weight()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO question_skill_weights(question_version_id, spatial_mode, weight)
  VALUES(NEW.id, NEW.spatial_mode, 1)
  ON CONFLICT(question_version_id, spatial_mode) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER question_versions_seed_skill_weight
AFTER INSERT ON question_versions
FOR EACH ROW EXECUTE FUNCTION geolearn_seed_question_skill_weight();

INSERT INTO question_skill_weights(question_version_id, spatial_mode, weight)
SELECT id, spatial_mode, 1 FROM question_versions
ON CONFLICT(question_version_id, spatial_mode) DO NOTHING;
