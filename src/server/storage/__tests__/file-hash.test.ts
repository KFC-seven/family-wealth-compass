import { describe, it, expect } from "vitest";
import { computeHash } from "../file-hash";

describe("computeHash", () => {
  it("returns known SHA256 for empty buffer", () => {
    const buffer = Buffer.alloc(0);
    const hash = computeHash(buffer);
    // SHA256 of empty string
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("returns known SHA256 for a known buffer", () => {
    const buffer = Buffer.from("hello world");
    const hash = computeHash(buffer);
    // SHA256 of "hello world"
    expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
  });

  it("returns MD5 when algorithm is specified", () => {
    const buffer = Buffer.from("hello");
    const hash = computeHash(buffer, "md5");
    // MD5 of "hello"
    expect(hash).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  it("returns different hashes for different content", () => {
    const h1 = computeHash(Buffer.from("content1"));
    const h2 = computeHash(Buffer.from("content2"));
    expect(h1).not.toBe(h2);
  });

  it("returns consistent results for same content", () => {
    const buffer = Buffer.from("consistent data");
    const h1 = computeHash(buffer);
    const h2 = computeHash(buffer);
    expect(h1).toBe(h2);
  });
});
