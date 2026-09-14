import { describe, expect, it } from "vitest";
import { hashPassword, hashPin, verifySecret } from "./password";

describe("credential hashing", () => {
  it("hashes and verifies teacher passwords without storing plaintext", async () => {
    const password = "GeoLearn-Teacher-Password-2026";
    const encoded = await hashPassword(password);
    expect(encoded).not.toContain(password);
    expect(encoded.startsWith("scrypt$")).toBe(true);
    await expect(verifySecret(password, encoded)).resolves.toBe(true);
    await expect(verifySecret("wrong-password", encoded)).resolves.toBe(false);
  });

  it("hashes numeric student PINs and rejects weak format", async () => {
    const encoded = await hashPin("482913");
    await expect(verifySecret("482913", encoded)).resolves.toBe(true);
    await expect(hashPin("12ab")).rejects.toThrow();
  });
});
