import "server-only";
import { Pool, type QueryResultRow } from "pg";

const globalDatabase = globalThis as unknown as { geolearnPool?: Pool };

function connectionString(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  return value;
}

export function database(): Pool {
  if (!globalDatabase.geolearnPool) {
    globalDatabase.geolearnPool = new Pool({ connectionString: connectionString(), max: 10, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000 });
  }
  return globalDatabase.geolearnPool;
}

export async function query<T extends QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<T[]> {
  const result = await database().query<T>(text, [...values]);
  return result.rows;
}

export async function checkDatabase(): Promise<{ connected: true; postgis: string }> {
  const [row] = await query<{ postgis: string }>("select PostGIS_Lib_Version() as postgis");
  if (!row) throw new Error("Database health query returned no rows");
  return { connected: true, postgis: row.postgis };
}
