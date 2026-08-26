# GeoLearn repository rules

## Product boundary

- GeoLearn is a **QuizInLearning + WebGIS** platform for SMA geography.
- A question configuration is the source of truth for the GIS layers, tools, required actions, and answer interaction made available to a learner.
- Do not hard-code one map page per question. Extend the typed question and GIS capability registries instead.
- Treat educational and spatial correctness, accessibility, privacy, and Indonesian-language clarity as product requirements.

## Repository boundary

- The static prototype at the repository root (`index.html`, `assets/`, and `.nojekyll`) is a maintained GitHub Pages artifact. Do not move it, convert it to Next.js, or give its deployment workflow a build dependency.
- The production product lives in `apps/web`. Product code must not import files from the root prototype.
- Architecture and requirements decisions belong in `docs`; container orchestration belongs in `deploy`; VPS/worktree automation belongs in `ops`.
- Never commit secrets, generated build output, database dumps, or production student data.

## Engineering workflow

- `main` is production, `develop` is staging, and work is developed on `feature/*` branches.
- Use TypeScript in strict mode. Prefer server components; add `"use client"` only at the browser boundary (for example Leaflet).
- Validate changes from the repository root with `npm run lint`, `npm run typecheck`, and `npm run build`.
- Database changes must be forward-compatible migrations and must account for PostGIS explicitly.
- Keep production and staging credentials, databases, Docker networks, and volumes isolated. PostgreSQL must never publish a host port.
- Update relevant documentation in the same change as an architectural, deployment, or product-contract change.
