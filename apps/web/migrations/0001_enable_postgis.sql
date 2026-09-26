-- GeoLearn migration 0001: spatial database prerequisites.
-- Forward-only: later migrations must not remove PostGIS while spatial data exists.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS geolearn_schema_migrations (
  version text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
