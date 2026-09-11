# GeoLearn repository rules

## Product boundary

- GeoLearn is a **QuizInLearning + WebGIS** platform for SMA geography.
- A question configuration is the source of truth for the GIS layers, tools, required actions, and answer interaction made available to a learner.
- Do not hard-code one map page per question. Extend the typed question and GIS capability registries instead.
- Treat educational and spatial correctness, accessibility, privacy, and Indonesian-language clarity as product requirements.

## Repository boundary

- The static prototype at the repository root (`index.html`, `assets/`, and `.nojekyll`) is a maintained review artifact. Do not let prototype code become a dependency of the production product.
- The real product lives in `apps/web`.
- Architecture and requirements decisions belong in `docs`; container orchestration belongs in `deploy`; VPS/worktree automation belongs in `ops`.
- Never commit secrets, generated build output, database dumps, or real student production data.

## Engineering workflow

- `production` is the stable release branch.
- `staging` is the integration branch deployed to the VPS staging environment.
- All implementation work must happen on `feature/*` branches created from `staging`.
- Feature work is merged by pull request into `staging` only after lint/typecheck/test/build pass.
- Promotion to production is performed by pull request from `staging` to `production` after VPS staging validation.
- Never develop directly on `production`.
- Avoid direct feature commits to `staging`; staging is an integration target.
- Use TypeScript in strict mode. Prefer server components; add `"use client"` only at the browser boundary (for example Leaflet).
- Validate changes from the repository root with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Database changes must be forward-compatible migrations and must account for PostGIS explicitly.
- Keep production and staging credentials, databases, Docker networks, volumes, sessions, and uploaded assets isolated.
- PostgreSQL must never publish a host port.
- Update relevant documentation in the same change as an architectural, deployment, or product-contract change.

## Codex workflow

- Treat Issue #8 and the locked product/domain/UI documents as the implementation contract.
- Codex should work in one focused `feature/*` branch at a time.
- Prefer vertical slices that are runnable end-to-end over broad scaffolding with unfinished placeholders.
- Do not rewrite the question-driven GIS engine into one bespoke page per question.
- Preserve existing working GIS behavior while migrating contracts to V2.
- Never merge automatically into `production`.
