import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required to run migrations");
const directory = resolve(import.meta.dirname, "../migrations");
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("select pg_advisory_lock(hashtext('geolearn_migrations'))");
  await client.query("CREATE TABLE IF NOT EXISTS geolearn_schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
  const files = (await readdir(directory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort();
  for (const file of files) {
    const sql = await readFile(resolve(directory, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const applied = await client.query("select checksum from geolearn_schema_migrations where version = $1", [file]);
    if (applied.rows[0]) {
      if (applied.rows[0].checksum !== checksum) throw new Error(`Applied migration was modified: ${file}`);
      continue;
    }
    await client.query("begin");
    try { await client.query(sql); await client.query("insert into geolearn_schema_migrations(version, checksum) values ($1, $2)", [file, checksum]); await client.query("commit"); console.info(`Applied ${file}`); }
    catch (error) { await client.query("rollback"); throw error; }
  }
} finally { await client.query("select pg_advisory_unlock(hashtext('geolearn_migrations'))").catch(() => undefined); await client.end(); }
