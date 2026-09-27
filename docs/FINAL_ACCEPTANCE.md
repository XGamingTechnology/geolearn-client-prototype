# GeoLearn Phase-1 Final Acceptance

Use this checklist against the exact staging commit proposed for release. Record the tester, UTC timestamp, commit SHA, browser/device, and evidence link for each run. A checked item means the behavior was observed end to end; it must not be checked from code inspection alone.

The read-only baseline is `bash ops/staging-acceptance.sh` on the staging VPS. The script verifies health, database connectivity and migrations, immutable-version triggers, container state, public health, and anonymous login entry points. It does not create or alter application records.

## Teacher

- [ ] Log in as a teacher, log out, and confirm a protected teacher URL can no longer be opened.
- [ ] In **Bank Data**, register a remote XYZ raster, upload/import a vector dataset, and confirm only eligible ready COG/XYZ datasets can be selected in a question.
- [ ] Create and preview one question for each stimulus: text, image, video, and WebGIS.
- [ ] For WebGIS, bind exactly one `SOURCE`, one `TARGET`, and at least one `CONTEXT`; reload the draft and confirm roles, order, visibility, labels, and styles remain synchronized.
- [ ] Publish the question, record the exact QuestionVersion number/ID, then create a new draft. Confirm edits to the draft do not change the published prompt, stimulus, media, dataset bindings, tools, or map experience.
- [ ] In **Question Bank**, switch between draft and published versions and confirm the displayed version metadata, stimulus, and map experience always belong to the selected version.
- [ ] Create a quiz version and assignment for a test class with an explicit open/close schedule and attempt limit.
- [ ] Open teacher results after the student run and confirm submission state, score, responses, and spatial-thinking analytics agree with the student result.

## Student

- [ ] Log in with class code, Student ID, and PIN; confirm another class's assignment cannot be opened.
- [ ] Start the assigned assessment, reload, and confirm the same in-progress attempt resumes.
- [ ] Save a multiple-choice response, reload, and confirm it persists.
- [ ] Execute a required GIS action, reload, and confirm completion persists and gates the response as configured.
- [ ] Submit once; confirm further response/GIS writes are rejected and the result follows the assignment visibility policy.
- [ ] Compare the student result score with teacher results and analytics.

## Map/GIS

- [ ] Exercise `standard`, `analysis`, `map-data`, and `slider` experiences from published QuestionVersions; confirm configured controls only, correct initial extent, layer order, and attribution.
- [ ] Execute Buffer at the configured distance, Overlay against `TARGET`, and Distance between `SOURCE` and `TARGET`; verify plausible geometry/count/distance and clear Indonesian errors for invalid inputs.
- [ ] Open Teacher Preview and exercise the same GIS tools. Before and after preview, verify database counts for `attempts`, `responses`, and `gis_activities` are unchanged.
- [ ] Check Street and Terrain tiles. Check Light with configured availability. Check Satellite with each configured provider and verify the documented Street fallback when no satellite credential is present.
- [ ] For Map Slider, verify all four pairings: vector/vector, vector/raster, raster/vector, and raster/raster. Confirm `CONTEXT` remains outside the swipe split and the divider works by touch and keyboard.

## Raster

- [ ] Register a `REMOTE_XYZ` source with `{z}/{x}/{y}`, bbox, and attribution; reject HTTP, private/local hosts, malformed templates, and invalid bbox values.
- [ ] Upload a GeoTIFF that passes COG conversion/validation and confirm the resulting DatasetVersion is `READY`, `PUBLISHED`, and selectable.
- [ ] Confirm a `LOCAL_COG` map uses a same-origin `/api/raster/.../tiles/{z}/{x}/{y}.png` signed template and never exposes a filesystem/storage key.
- [ ] Confirm expired or tampered raster tile signatures fail, while an unexpired signature serves a tile with the expected cache/content headers.
- [ ] Verify raster bbox, opacity, attribution, sensor/date/temporal metadata, nodata behavior, and failure messaging on desktop and mobile.

## Mobile

- [ ] At 320 px and 390 px widths, open teacher navigation, choose **Lainnya**, and reach **Bank Data** without a direct URL.
- [ ] Confirm builder, preview, assignment, student assessment, map controls, slider divider, result, and analytics have no unreachable actions or horizontal page overflow.
- [ ] Test map pan/zoom and slider gestures without trapping page scrolling; test all interactive controls with keyboard and visible focus at desktop width.

## Deployment

- [ ] Record `git rev-parse HEAD` and confirm it equals the PR head approved for release.
- [ ] Run `bash ops/staging-acceptance.sh` successfully on the VPS and attach its complete output.
- [ ] Confirm staging uses isolated credentials, database, Docker network, volumes, sessions, and uploads; confirm PostgreSQL publishes no host port.
- [ ] Confirm HTTPS, health endpoint, Caddy routing, media range delivery, raster tiles, and restart persistence.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` from a clean checkout of the final head.
- [ ] Record any waived/manual-only item with owner, risk, evidence, and follow-up issue. Do not merge while a release-critical item is failed or unverified.
