-- GeoLearn migration 0012: question groups represent Spatial Thinking categories.
-- Legacy stimulus-oriented groups remain readable for backward compatibility,
-- but new groups use spatial_mode and no longer constrain per-question stimulus type.

ALTER TABLE question_groups
  ADD COLUMN spatial_mode text CHECK (
    spatial_mode IN ('location','condition','influence','region','hierarchy','analogy','pattern','association')
  );

ALTER TABLE question_groups
  ALTER COLUMN stimulus_type DROP NOT NULL;

CREATE INDEX question_groups_spatial_mode_idx
  ON question_groups (spatial_mode, scope, status);
