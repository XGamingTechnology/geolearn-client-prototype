#!/usr/bin/env bash
set -Eeuo pipefail

ROOT=/opt/geolearn
WORKTREE="$ROOT/worktrees/staging"
ENV_FILE="$ROOT/secrets/staging.env"
COMPOSE_FILE="$WORKTREE/deploy/compose.staging.yml"
PUBLIC_URL="https://geolearn.43-156-101-13.sslip.io"

fail(){ echo "FAIL: $*" >&2; exit 1; }
ok(){ echo "OK: $*"; }

[[ -d "$WORKTREE" ]] || fail "Missing staging worktree: $WORKTREE"
[[ -f "$ENV_FILE" ]] || fail "Missing staging env: $ENV_FILE"

echo "== GeoLearn staging acceptance =="
echo "worktree: $WORKTREE"

git -C "$WORKTREE" rev-parse --abbrev-ref HEAD | grep -qx staging || fail "Worktree is not on staging branch"
HEAD_SHA="$(git -C "$WORKTREE" rev-parse HEAD)"
echo "commit: $HEAD_SHA"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "== Health =="
HEALTH=""
for attempt in $(seq 1 30); do
  if HEALTH="$(curl -fsS --max-time 5 http://127.0.0.1:3101/api/health 2>/dev/null)"; then
    break
  fi
  echo "Waiting for web health... (${attempt}/30)"
  sleep 2
done
[[ -n "$HEALTH" ]] || fail "web health did not become ready within 60 seconds"
echo "$HEALTH"
echo "$HEALTH" | grep -q '"status":"ok"' || fail "health status is not ok"
echo "$HEALTH" | grep -q '"environment":"staging"' || fail "health environment is not staging"
echo "$HEALTH" | grep -q '"connected":true' || fail "database is not connected"
ok "health endpoint"

echo "== Database schema =="
cat <<'SQL' | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T database sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
select PostGIS_Lib_Version();
select version from geolearn_schema_migrations order by version;
DO $
DECLARE
  expected text[] := ARRAY[
    '0001_enable_postgis.sql',
    '0002_identity_auth.sql',
    '0003_account_management.sql',
    '0004_content_authoring.sql',
    '0005_data_gis.sql',
    '0006_assessment_runtime.sql',
    '0007_question_dataset_bindings.sql',
    '0008_question_media_bindings.sql',
    '0009_spatial_analytics.sql'
  ];
  missing text;
BEGIN
  SELECT string_agg(e, ', ') INTO missing
  FROM unnest(expected) e
  WHERE NOT EXISTS (SELECT 1 FROM geolearn_schema_migrations m WHERE m.version=e);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing migrations: %', missing;
  END IF;
END $;
select to_regclass('public.staff_users') as staff_users,
       to_regclass('public.classes') as classes,
       to_regclass('public.question_versions') as question_versions,
       to_regclass('public.dataset_features') as dataset_features,
       to_regclass('public.assignments') as assignments,
       to_regclass('public.attempts') as attempts,
       to_regclass('public.response_spatial_artifacts') as response_spatial_artifacts,
       to_regclass('public.spatial_skill_scores') as spatial_skill_scores;
SQL
ok "critical database schema"

echo "== Container health =="
WEB_HEALTH=""
for attempt in $(seq 1 10); do
  WEB_HEALTH="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' geolearn-staging-web-1 2>/dev/null || true)"
  if [[ "$WEB_HEALTH" == "healthy" || "$WEB_HEALTH" == "none" ]]; then
    break
  fi
  sleep 3
done
if [[ "$WEB_HEALTH" != "healthy" && "$WEB_HEALTH" != "none" ]]; then
  fail "web container health=$WEB_HEALTH"
fi
ok "web container state"

echo "== Public route =="
if curl -fsS --max-time 20 "$PUBLIC_URL/api/health" >/tmp/geolearn-staging-health.json; then
  grep -q '"status":"ok"' /tmp/geolearn-staging-health.json || fail "public health response not ok"
  ok "public staging URL"
else
  echo "WARN: public hostname could not be reached from this VPS. Check host Caddy/DNS separately."
fi

cat <<'CHECKLIST'

== Manual critical-flow checklist ==
[ ] SCHOOL_ADMIN login works
[ ] Create/open Class
[ ] Add student, receive one-time Student ID + PIN
[ ] Student login with Class Code + Student ID + PIN
[ ] Create/publish QuestionVersion
[ ] Bind MediaAsset or DatasetVersion as required
[ ] Create immutable QuizVersion
[ ] Create Assignment for class
[ ] Student sees Assignment
[ ] Start/resume Attempt
[ ] WebGIS renders bound DatasetVersion in Leaflet
[ ] Required Buffer executes via PostGIS and completes gating
[ ] A-E or spatial response persists
[ ] Submit Attempt
[ ] Student Result follows visibility policy
[ ] Teacher Results shows submitted attempt
[ ] Spatial Thinking analytics recompute and render

Do not close Slice #14/#15 until this checklist is completed on staging.
CHECKLIST
