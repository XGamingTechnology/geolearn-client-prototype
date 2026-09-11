# GeoLearn environments

GeoLearn uses two long-lived deployment environments.

## Staging

Purpose:
- active development integration
- UI/UX review
- backend/API testing
- database migration testing
- GIS workflow testing
- mobile/desktop validation

Git branch:

`staging`

VPS worktree:

`/opt/geolearn/worktrees/staging`

Application bind:

`127.0.0.1:3101`

Public URL:

`https://geolearn.43-156-101-13.sslip.io`

Database:
- dedicated staging PostgreSQL/PostGIS database
- dedicated credentials
- dedicated Docker volume/network
- never shared with production
- no public database port

Staging may contain test/demo data only. It must not be treated as the final public product.

## Production

Purpose:
- stable reviewed releases only
- real deployment after staging acceptance

Git branch:

`production`

VPS worktree:

`/opt/geolearn/worktrees/production`

Application bind:

`127.0.0.1:3100`

Public URL:

A dedicated production domain will be configured later. Do not use the sslip.io staging hostname for production.

Database:
- separate production PostgreSQL/PostGIS database
- separate secrets, volume, network, uploads, and backups
- no dependency on staging state

## Promotion flow

```text
feature/*
   ↓
Pull Request
   ↓
staging branch
   ↓
VPS staging
https://geolearn.43-156-101-13.sslip.io
   ↓
QA / UI / mobile / GIS / database validation
   ↓
Pull Request: staging → production
   ↓
production branch
   ↓
VPS production
   ↓
official production domain
```

## Rules

1. No feature development directly on `production`.
2. Feature branches are created from `staging`.
3. Feature PRs target `staging`.
4. Staging is deployed and reviewed before production promotion.
5. Production promotion is a separate PR from `staging` to `production`.
6. Staging and production never share database credentials, data volumes, session secrets, upload storage, or backups.
7. Host Caddy is the public TLS/reverse-proxy layer.
8. Staging app is exposed only on loopback `127.0.0.1:3101`.
9. Production app is exposed only on loopback `127.0.0.1:3100`.
10. PostgreSQL/PostGIS is never published directly to the Internet.
