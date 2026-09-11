# Domain model v2 — foundation boundary

## Purpose

This slice establishes infrastructure without prematurely implementing teacher authentication, student PIN sessions, class CRUD, question-bank persistence, uploads, GIS authoring, or assignment/attempt persistence.

## Aggregate roadmap

Future domain aggregates are `User/Role`, `Class/Membership`, `Curriculum`, `Question/QuestionVersion`, `GISResource`, `Assignment`, and `Attempt/ActivityEvidence`. A published question version remains the orchestration source for spatial-thinking mode, visible layers, enabled tools, required spatial actions, response model, and feedback.

Identifiers will be server-generated UUIDs. Records containing learner activity require authorization, retention rules, and auditing before production use. Spatial records must declare SRID constraints and GiST indexes when introduced.

## Slice 1 persisted contract

Only database infrastructure is persisted: `geolearn_schema_migrations` records immutable migration filenames, SHA-256 checksums, and application timestamps. Migration `0001_enable_postgis.sql` explicitly enables PostGIS. UI summary values are intentionally empty states; no mock student records are presented as real data.
