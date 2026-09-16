# GeoLearn staging acceptance

Run only on the GeoLearn VPS against the dedicated staging worktree.

## 1. Deploy current staging

```bash
cd /opt/geolearn/worktrees/staging
sudo ./ops/deploy-worktree.sh staging
```

This fetches `staging`, resets the staging worktree, builds the web image, applies pending migrations through the Compose migrator, and starts the staging services.

## 2. Automated smoke

```bash
cd /opt/geolearn/worktrees/staging
sudo bash ./ops/staging-acceptance.sh
```

The script checks:
- current worktree branch/commit,
- Compose services,
- loopback health endpoint on `127.0.0.1:3101`,
- PostgreSQL connectivity,
- PostGIS,
- migration history,
- critical identity/content/data/assessment/analytics tables,
- web container health,
- public staging health route when resolvable.

## 3. Manual end-to-end acceptance

Use staging-only test identities. Never put passwords or PINs into Git, issue comments, or chat logs.

Teacher:
1. Log in as SCHOOL_ADMIN.
2. Create/open a class.
3. Add a student and record the one-time Student ID + PIN locally.
4. Create or open a published QuestionVersion.
5. For WebGIS, bind published SOURCE/TARGET DatasetVersions.
6. Configure a required Buffer action.
7. Create immutable QuizVersion.
8. Assign it to the class.

Student:
1. Log in with Class Code + Student ID + PIN.
2. Open the assignment.
3. Start/resume the attempt.
4. Confirm Leaflet renders the bound DatasetVersion.
5. Run Buffer and confirm the answer control unlocks only after successful server-side GIS execution.
6. Save A–E or a spatial response.
7. Submit the attempt.
8. Confirm result visibility behavior.

Teacher results:
1. Confirm the submitted attempt is visible.
2. Confirm score/response/GisActivity exist.
3. Open Spatial Thinking analytics.
4. Confirm assignment completion, question accuracy, GIS completion, and the 8-mode profile render without cross-class leakage.

## 4. Acceptance evidence

Record:
- staging commit SHA,
- health JSON,
- migration versions,
- pass/fail for each manual step,
- screenshots only when useful and with test data,
- any blocker as a GitHub issue.

Only after this passes should Slice #14 and #15 be closed and Release #16 move to production-promotion preparation.
