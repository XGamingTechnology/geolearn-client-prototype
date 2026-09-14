import { createHash } from "node:crypto";
import { query } from "@/server/db";

const WINDOW_MINUTES = 15;
const FAILURE_LIMIT = 5;

export class AuthRateLimitedError extends Error {
  constructor() {
    super("Authentication temporarily rate limited");
    this.name = "AuthRateLimitedError";
  }
}

export function throttleKey(kind: "teacher" | "student", normalizedPrincipal: string): string {
  return createHash("sha256").update(kind + ":" + normalizedPrincipal).digest("hex");
}

export async function assertLoginAllowed(keyHash: string): Promise<void> {
  const [row] = await query<{ blocked_until: Date | null }>(
    "select blocked_until from auth_login_throttles where key_hash = $1",
    [keyHash],
  );
  if (row?.blocked_until && new Date(row.blocked_until).getTime() > Date.now()) {
    throw new AuthRateLimitedError();
  }
}

export async function recordLoginFailure(keyHash: string): Promise<void> {
  await query(
    `insert into auth_login_throttles(key_hash, failure_count, window_started_at, blocked_until, updated_at)
     values ($1, 1, now(), null, now())
     on conflict (key_hash) do update set
       failure_count = case
         when auth_login_throttles.window_started_at < now() - interval '${WINDOW_MINUTES} minutes' then 1
         else auth_login_throttles.failure_count + 1
       end,
       window_started_at = case
         when auth_login_throttles.window_started_at < now() - interval '${WINDOW_MINUTES} minutes' then now()
         else auth_login_throttles.window_started_at
       end,
       blocked_until = case
         when auth_login_throttles.blocked_until > now() then auth_login_throttles.blocked_until
         when (
           case
             when auth_login_throttles.window_started_at < now() - interval '${WINDOW_MINUTES} minutes' then 1
             else auth_login_throttles.failure_count + 1
           end
         ) >= ${FAILURE_LIMIT} then now() + interval '${WINDOW_MINUTES} minutes'
         else null
       end,
       updated_at = now()`,
    [keyHash],
  );
}

export async function clearLoginFailures(keyHash: string): Promise<void> {
  await query("delete from auth_login_throttles where key_hash = $1", [keyHash]);
}
