# GeoLearn product architecture

## Product principle

GeoLearn is a **QuizInLearning + WebGIS** platform for SMA geography. The question configuration is the orchestration boundary: it determines the spatial-thinking mode, visible layers, enabled GIS tools, required spatial actions, response model, and feedback. The interface must therefore render capabilities from configuration rather than route users to bespoke maps.

## Repository boundaries

| Path | Responsibility | Deployment |
|---|---|---|
| `/index.html`, `/assets`, `/.nojekyll` | Static client-review prototype | GitHub Pages from `main` |
| `/apps/web` | Next.js product and future server/API boundary | Container on the VPS |
| `/docs` | Architecture, requirements, migration, and operating decisions | Versioned with code |
| `/deploy` | Docker Compose, Caddy, and environment templates | Consumed by each worktree |
| `/ops` | VPS bootstrap/deploy procedures and scripts | Run by an operator/CI on the VPS |

The static prototype and product application are intentionally independent. A failure in the product build cannot prevent Pages from uploading the existing root artifact.

## Target logical architecture

```text
Browser
  -> Caddy (TLS, security headers)
     -> Next.js web/server boundary
        -> question service -> PostgreSQL
        -> GIS configuration -> PostGIS geometry/query operations
        -> browser GIS runtime -> React Leaflet + Leaflet + Turf.js
```

- **Next.js server components/actions or route handlers** own authenticated product data access. Browser code never receives database credentials.
- **PostgreSQL + PostGIS** is authoritative for users, curriculum content, question configuration, attempts, and persisted spatial datasets. Spatial indexes and SRID constraints are required when schemas are introduced.
- **Leaflet/React Leaflet** renders interactive maps. Turf.js handles appropriate, bounded client-side preview/interaction calculations; authoritative or expensive analysis belongs in PostGIS.
- A typed **GIS tool registry** maps stable tool IDs to UI and execution behavior. A typed question schema refers only to registered tools and layers.

## Security and environment isolation

Production and staging use different Compose projects, database credentials, database volumes, Caddy state, and named networks. Database services have no `ports` mapping and join only an `internal` application network. Only Caddy binds host ports. Secrets live under `/opt/geolearn/secrets`, outside Git worktrees, with restrictive permissions.

Authentication, authorization roles, audit events, backups, restore tests, rate limits, and privacy retention rules are required before storing real student data; they are intentionally not implemented in this foundation.

## Initial module contracts

- `features/questions/types.ts`: small compile-time question configuration contract.
- `features/gis/tool-registry.ts`: capability catalog used by the adaptive toolbar.
- `components/learning-workspace.tsx`: question-driven coordination boundary.
- `components/map-workspace.tsx`: client-only Leaflet boundary and a small Turf buffer demonstration.

These are scaffolding contracts, not a finalized domain model. Introduce runtime schema validation and migrations before accepting authored content.
