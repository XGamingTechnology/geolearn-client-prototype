-- GeoLearn migration 0013: teacher review layer for submitted responses.
-- Student responses remain unchanged; teacher review stores score override and feedback separately.

CREATE TABLE teacher_response_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL UNIQUE REFERENCES responses(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  auto_score numeric(12,2),
  final_score numeric(12,2) NOT NULL CHECK (final_score >= 0),
  feedback text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX teacher_response_reviews_reviewer_idx
  ON teacher_response_reviews (reviewer_id, reviewed_at DESC);
