import { checkDatabase } from "@/server/db";

export const dynamic = "force-dynamic";

type Health = { status: "ok" | "degraded"; environment: string; database: { connected: boolean; postgis?: string }; timestamp: string };

export async function GET() {
  const body: Health = { status: "ok", environment: process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? "development", database: { connected: true }, timestamp: new Date().toISOString() };
  try {
    const database = await checkDatabase();
    body.database = database;
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch {
    body.status = "degraded";
    body.database = { connected: false };
    return Response.json(body, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
