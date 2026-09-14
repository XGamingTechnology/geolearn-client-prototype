import { describe, expect, it } from "vitest";
import { createOpaqueSessionToken, hashSessionToken } from "./token";

describe("session tokens", () => {
  it("creates opaque random tokens and stores only deterministic hashes", () => {
    const first = createOpaqueSessionToken();
    const second = createOpaqueSessionToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan(30);
    expect(hashSessionToken(first)).toHaveLength(64);
    expect(hashSessionToken(first)).toBe(hashSessionToken(first));
    expect(hashSessionToken(first)).not.toBe(first);
  });
});
