import { describe, it, expect } from "vitest";
import {
  validateFileSize,
  validateMimeType,
  validateExtension,
  DEFAULT_MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
} from "../file-validation";

describe("validateFileSize", () => {
  it("returns valid for file within default limit", () => {
    const result = validateFileSize(1024);
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it("returns invalid for file exceeding default limit", () => {
    const result = validateFileSize(DEFAULT_MAX_FILE_SIZE + 1);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("文件过大");
  });

  it("respects custom maxSize parameter", () => {
    const result = validateFileSize(5000, 1024);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("文件过大");
  });

  it("returns valid for zero bytes", () => {
    const result = validateFileSize(0);
    expect(result.valid).toBe(true);
  });

  it("returns valid for exactly at limit", () => {
    const result = validateFileSize(DEFAULT_MAX_FILE_SIZE);
    expect(result.valid).toBe(true);
  });

  it("reports correct size in the error message", () => {
    const result = validateFileSize(20 * 1024 * 1024); // 20MB
    expect(result.valid).toBe(false);
    // 20MB > 10MB limit
    expect(result.message).toContain("20.0MB");
  });
});

describe("validateMimeType", () => {
  it('validates "image/jpeg"', () => {
    const result = validateMimeType("image/jpeg");
    expect(result.valid).toBe(true);
  });

  it('validates "image/png"', () => {
    const result = validateMimeType("image/png");
    expect(result.valid).toBe(true);
  });

  it('validates "image/webp"', () => {
    const result = validateMimeType("image/webp");
    expect(result.valid).toBe(true);
  });

  it('rejects "application/pdf"', () => {
    const result = validateMimeType("application/pdf");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("不支持的文件类型");
  });

  it('rejects "image/gif"', () => {
    const result = validateMimeType("image/gif");
    expect(result.valid).toBe(false);
  });

  it('rejects empty string', () => {
    const result = validateMimeType("");
    expect(result.valid).toBe(false);
  });

  it("rejects unexpected MIME type", () => {
    const result = validateMimeType("text/plain");
    expect(result.valid).toBe(false);
  });
});

describe("validateExtension", () => {
  it('validates ".jpg"', () => {
    expect(validateExtension("photo.jpg").valid).toBe(true);
  });

  it('validates ".PNG" (case-insensitive)', () => {
    expect(validateExtension("photo.PNG").valid).toBe(true);
  });

  it('validates ".jpeg"', () => {
    expect(validateExtension("photo.jpeg").valid).toBe(true);
  });

  it('validates ".webp"', () => {
    expect(validateExtension("photo.webp").valid).toBe(true);
  });

  it('rejects ".pdf"', () => {
    const result = validateExtension("file.pdf");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("不支持的文件扩展名");
  });

  it('rejects filename with no extension', () => {
    const result = validateExtension("noext");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("不支持的文件扩展名");
  });

  it('rejects ".gif"', () => {
    const result = validateExtension("animation.gif");
    expect(result.valid).toBe(false);
  });

  it('handles multiple dots correctly', () => {
    expect(validateExtension("my.photo.jpg").valid).toBe(true);
    expect(validateExtension("archive.tar.gz").valid).toBe(false);
  });
});
