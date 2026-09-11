import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/server/db", () => ({ checkDatabase: vi.fn() }));
import { checkDatabase } from "@/server/db";
import { GET } from "./route";
const mockedCheck = vi.mocked(checkDatabase);
describe("GET /api/health", () => {
  beforeEach(() => { vi.unstubAllEnvs(); mockedCheck.mockReset(); });
  it("reports app, environment, and PostGIS connectivity", async () => { vi.stubEnv("APP_ENV", "test"); mockedCheck.mockResolvedValue({ connected: true, postgis: "3.5.2" }); const response = await GET(); expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ status: "ok", environment: "test", database: { connected: true, postgis: "3.5.2" } }); });
  it("does not expose connection errors or secrets", async () => { vi.stubEnv("DATABASE_URL", "postgres://user:secret@database/db"); mockedCheck.mockRejectedValue(new Error(process.env.DATABASE_URL)); const response = await GET(); const text = await response.text(); expect(response.status).toBe(503); expect(text).not.toContain("secret"); expect(JSON.parse(text)).toMatchObject({ status: "degraded", database: { connected: false } }); });
});
