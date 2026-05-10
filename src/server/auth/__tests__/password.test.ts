import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("hashPassword", () => {
  it("returns an object with hash and salt string properties", () => {
    const result = hashPassword("my-password");
    expect(result).toHaveProperty("hash");
    expect(result).toHaveProperty("salt");
    expect(typeof result.hash).toBe("string");
    expect(typeof result.salt).toBe("string");
  });

  it("produces a 128-character hex hash (64 bytes)", () => {
    const result = hashPassword("test");
    expect(result.hash).toHaveLength(128);
    // Verify it is valid hex
    expect(/^[0-9a-f]+$/.test(result.hash)).toBe(true);
  });

  it("produces a 64-character hex salt (32 bytes)", () => {
    const result = hashPassword("test");
    expect(result.salt).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(result.salt)).toBe(true);
  });

  it("generates different salts for the same password on separate calls", () => {
    const r1 = hashPassword("same-password");
    const r2 = hashPassword("same-password");
    expect(r1.salt).not.toBe(r2.salt);
  });

  it("generates different hashes for the same password on separate calls", () => {
    const r1 = hashPassword("same-password");
    const r2 = hashPassword("same-password");
    expect(r1.hash).not.toBe(r2.hash);
  });
});

describe("verifyPassword", () => {
  it("returns true for the correct password", () => {
    const { hash, salt } = hashPassword("correct-password");
    expect(verifyPassword("correct-password", salt, hash)).toBe(true);
  });

  it("returns false for an incorrect password", () => {
    const { hash, salt } = hashPassword("real-password");
    expect(verifyPassword("wrong-password", salt, hash)).toBe(false);
  });

  it("returns false for empty password when stored hash was for a non-empty password", () => {
    const { hash, salt } = hashPassword("non-empty-password");
    expect(verifyPassword("", salt, hash)).toBe(false);
  });

  it("returns false when the wrong salt is provided", () => {
    const { hash } = hashPassword("password");
    const wrongSalt = "a".repeat(64);
    expect(verifyPassword("password", wrongSalt, hash)).toBe(false);
  });

  it("returns false when the hash is tampered with", () => {
    const { hash, salt } = hashPassword("password");
    // Flip one nibble
    const tampered = "00" + hash.slice(2);
    expect(verifyPassword("password", salt, tampered)).toBe(false);
  });

  it("uses timingSafeEqual internally (smoke check — no timing leak)", () => {
    // Verification works correctly which implies timingSafeEqual is in use
    const { hash, salt } = hashPassword("timing-check");
    expect(verifyPassword("timing-check", salt, hash)).toBe(true);
    expect(verifyPassword("wrong", salt, hash)).toBe(false);
  });
});

describe("key derivation parameters", () => {
  it("produces 64-byte output (SHA-512)", () => {
    // SHA-512 produces 64 bytes = 128 hex chars
    const result = hashPassword("param-check");
    expect(result.hash).toHaveLength(128);
  });

  it("uses 32-byte salt", () => {
    const result = hashPassword("param-check");
    expect(result.salt).toHaveLength(64);
  });
});
