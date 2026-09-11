# Exact migration plan

## Phase 0 — preserve and establish boundaries (this change)

1. Keep root `index.html`, `assets/`, `.nojekyll`, and the Pages workflow in place and independent of Node.
2. Introduce npm workspaces without relocating any prototype file.
3. Bootstrap `apps/web` on Next.js 16 with strict TypeScript, Leaflet 1.9.4, React Leaflet, and Turf.js.
4. Add a minimal typed question contract and GIS tool registry to prove question-driven capability selection.
5. Add production/staging Compose definitions, private PostGIS networks, Caddy, environment templates, and the worktree deployment script.
6. Record architecture, initial product requirements, repository rules, and validation commands.

**Exit:** Pages paths are unchanged; lint/typecheck/build pass; Compose configs resolve with non-secret example values.

## Phase 1 — domain and delivery baseline (Slice 1 foundation complete)

1. Add an ADR process and choose authentication/session and migration tooling.
2. Model users/roles, curriculum, versioned questions, GIS resources, attempts, and activity evidence.
3. Extend the existing forward-only, checksummed migration system with domain schemas, runtime validation, SRID constraints, and spatial-index checks. Migration `0001_enable_postgis.sql` already activates PostGIS explicitly.
4. Add CI for checks, container build, dependency/security scanning, and migration verification.
5. Add health/readiness endpoints, structured logging, backup jobs, and a documented restore drill.

**Exit:** a deployable authenticated vertical slice reads one published question and records a test attempt in an isolated environment.

## Phase 2 — learner MVP

1. Build catalog, question session, adaptive GIS tools/layers, response, feedback, and resumable attempts.
2. Implement the priority spatial-thinking tools against the registry, with PostGIS for authoritative analysis and Turf only for safe client previews.
3. Meet the accessibility and low-bandwidth acceptance plan; add browser/device coverage.
4. Pilot with synthetic/non-sensitive data, then conduct educational and geospatial review.

**Exit:** the agreed pilot question set runs end-to-end with verified content, accessibility, telemetry, and recovery procedures.

## Phase 3 — authoring and analytics

1. Add teacher authoring with draft/review/publish and question preview.
2. Add standards-aligned learning analytics with transparent scoring and appropriate privacy controls.
3. Add GIS ingestion validation, provenance, licensing, and publication workflows.

**Exit:** authorized staff can safely publish versioned content and interpret student outcomes without direct database access.

## Rollout and rollback

- Merge features into `develop`; deploy and validate the staging worktree.
- Promote reviewed commits to `main`; deploy the production worktree by immutable commit.
- Application rollback resets the relevant worktree to a known commit and reruns Compose. Database migrations must be backward compatible during rollout; destructive cleanup occurs only after the rollback window.
- The GitHub Pages prototype remains available as the independent reference/demo throughout migration.
