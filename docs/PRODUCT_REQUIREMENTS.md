# GeoLearn product requirements — foundation

## Vision and users

GeoLearn helps SMA learners form geographic explanations through evidence gathered on an interactive map. Initial actors are **students**, **teachers/content authors**, and **administrators**.

## Core learning loop

1. A learner chooses a geography theme and question.
2. The product loads a versioned question configuration.
3. Only the configured GIS layers and tools are available.
4. The learner performs required spatial actions.
5. The product enables the configured response interaction.
6. The learner submits, receives explanation-oriented feedback, and produces an auditable learning attempt.

## Foundation acceptance criteria

- The root static prototype remains directly runnable and deployable through the existing Pages workflow.
- `apps/web` is a strict TypeScript Next.js 16 application with a server/client boundary suitable for Leaflet.
- A typed example question controls visible tools, layers, and a required GIS action.
- Leaflet 1.9.x and React Leaflet render the product map; Turf.js demonstrates a bounded client-side spatial operation.
- Product containers run behind Caddy and connect privately to PostGIS.
- Production and staging have separate worktrees, credentials, networks, and persistent volumes.
- Repository-level lint, typecheck, and build commands are available.

## MVP requirements (next phases, not this change)

- Secure authentication and role-based authorization.
- Curriculum/theme/question management with draft, review, publish, and immutable version history.
- Runtime-validated question configurations and GIS data provenance/licensing metadata.
- Attempt recording, required-action evidence, scoring, explanations, and teacher-facing learning analytics.
- Accessible keyboard/touch behavior and low-bandwidth design appropriate to target schools.
- PostGIS migrations, spatial validation/indexing, backups, monitoring, structured logs, and disaster-recovery tests.

## Explicit non-goals for the foundation

- Full authentication, authoring, scoring, analytics, or administrative flows.
- Final database schema or GIS analysis engine.
- Production map data or claims of scientific authority.
- Migration of prototype simulation data into a production database.

## Implemented vertical slice: Spatial Influence

The foundation includes one complete synthetic-data question: a river overflows up to 500 meters and the learner must identify the affected village. Its acceptance behavior is:

1. The page loads a typed question configuration containing river/village layers, tools, required activity, answers, correct answer, and explanation.
2. The Leaflet adapter renders both configured source layers.
3. The toolbar exposes only `buffer` and `overlay`, as selected by the question.
4. `Buffer 500 m` is mandatory and unlocks the A/B/C/D answer controls only after the GIS engine records successful completion.
5. `Overlay` is optional, rejects execution before a buffer exists, and highlights intersecting villages when completed.
6. Every successful analysis appends a timestamped GIS activity record.
7. Submit remains disabled without both the required activity and a selected answer.
8. Submission reports correct/incorrect status and the configured geographic explanation.

All geometry and village names in this slice are simulated and must not be interpreted as real flood-risk information.

## Quality attributes

- **Safety/privacy:** collect the minimum student data; define retention and consent before launch.
- **Accessibility:** target WCAG 2.2 AA, including a non-map textual route to essential information.
- **Performance:** progressively load the map and bound client geometry size/complexity.
- **Observability:** future request IDs, structured logs, health/readiness signals, and deploy markers.
- **Content integrity:** every published layer records source, license, date, CRS, and review status.
