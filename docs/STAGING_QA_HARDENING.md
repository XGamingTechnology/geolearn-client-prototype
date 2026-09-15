# Staging QA & Hardening Checklist

Target: GeoLearn staging release candidate.

## Assessment acceptance
- Teacher can create/use published QuestionVersion.
- Teacher can create immutable QuizVersion and assign it to an authorized class.
- Student authenticates with Class Code + Student ID + PIN.
- Student can start/resume Attempt.
- Image/video stimulus renders only the assets bound to the assigned QuestionVersion.
- WebGIS loads only bound DatasetVersions.
- Required Buffer/Overlay/Distance executes server-side in PostGIS and is recorded in GisActivity.
- A-E Response persists and scores.
- Point/Line/Polygon/feature-select ResponseSpatialArtifact persists.
- Geometry distance, overlap and selected-feature rules score from PostGIS.
- Attempt submit persists final score and result visibility policy is respected.

## Analytics acceptance
- Assignment completion derives from Enrollment + Attempt, not cached counters.
- Question accuracy derives from Response tied to immutable QuestionVersion.
- Duration derives from persisted attempt/response timestamps.
- GIS completion derives from GisActivity.
- Spatial Thinking profile covers location, condition, influence, region, hierarchy, analogy, pattern, association.
- SpatialSkillScore can be deleted and recomputed from immutable source records.

## Mobile / accessibility
- Teacher core pages usable at <768 px.
- Student assessment usable on mobile portrait.
- GIS controls have >=44 px touch targets where practical.
- Form controls have labels.
- Images have alt text from QuestionVersion media binding.
- Keyboard focus remains visible.
- Empty/loading/error states are human readable.

## Security / privacy
- Tenant isolation checked for School-scoped reads/writes.
- PRIVATE content remains owner-only.
- Student cannot browse content/data banks.
- Attempt endpoints require matching student + enrollment + school.
- Password/PIN plaintext never persisted.
- Security-sensitive credential changes revoke sessions.
- PostgreSQL has no public host port.
- Staging and production DB/session/asset secrets remain isolated.
- GIS endpoints never accept arbitrary unbound DatasetVersion IDs from students.

## Operations
- Apply all migrations to staging from clean/known schema.
- Verify PostGIS extension/version.
- Run health endpoint after deployment.
- Back up staging database before destructive migration rehearsal.
- Verify restore procedure into isolated database.
- Review audit/event retention and define production retention period before launch.
- Perform staging -> production migration rehearsal before Release #16.
