import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockMkdir, mockWriteFile, mockUnlink } = vi.hoisted(() => ({
  mockMkdir: vi.fn(),
  mockWriteFile: vi.fn(),
  mockUnlink: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    unlink: mockUnlink,
  },
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
  unlink: mockUnlink,
}));

// Mock computeHash to return a deterministic value
vi.mock("../file-hash", () => ({
  computeHash: vi.fn(() => "abcdef1234567890abcdef1234567890abcdef12"),
}));

import { LocalStorageProvider } from "../providers/local-storage-provider";
import type { SaveFileInput } from "../types";

describe("LocalStorageProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves file to correct directory structure (YYYY/MM/)", async () => {
    const provider = new LocalStorageProvider("/uploads");
    const input: SaveFileInput = {
      buffer: Buffer.from("test content"),
      originalFileName: "photo.jpg",
      mimeType: "image/jpeg",
    };
    const result = await provider.save(input);

    // Should create YYYY/MM/ directory
    expect(mockMkdir).toHaveBeenCalledWith(
      expect.stringMatching(/uploads[\\\/]imports[\\\/]\d{4}[\\\/]\d{2}/),
      { recursive: true },
    );
    expect(result.storageProvider).toBe("local");
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.sizeBytes).toBe(12); // "test content".length
    expect(result.hash).toBeTruthy();
  });

  it("generates hash-based filename with correct extension", async () => {
    const provider = new LocalStorageProvider("/uploads");
    const input: SaveFileInput = {
      buffer: Buffer.from("hello"),
      originalFileName: "photo.jpg",
      mimeType: "image/jpeg",
    };
    const result = await provider.save(input);
    // hash is mocked to return a fixed string, first 16 chars + ".jpg"
    expect(result.storageKey).toContain("abcdef1234567890.jpg");
  });

  it("passes path traversal check for safe filenames", async () => {
    const provider = new LocalStorageProvider("/uploads");
    const input: SaveFileInput = {
      buffer: Buffer.from("test"),
      originalFileName: "safe_photo.jpg",
      mimeType: "image/jpeg",
    };
    await expect(provider.save(input)).resolves.not.toThrow();
  });

  it("handles missing uploadDir by creating recursively", async () => {
    const provider = new LocalStorageProvider("/new-dir/uploads");
    const input: SaveFileInput = {
      buffer: Buffer.from("test"),
      originalFileName: "file.jpg",
      mimeType: "image/jpeg",
    };
    const result = await provider.save(input);
    expect(result.storageProvider).toBe("local");
    expect(mockMkdir).toHaveBeenCalledWith(
      expect.stringMatching(/new-dir[\\\/]uploads[\\\/]imports/),
      { recursive: true },
    );
  });

  it("uses .bin extension when original filename has no extension", async () => {
    const provider = new LocalStorageProvider("/uploads");
    const input: SaveFileInput = {
      buffer: Buffer.from("noext"),
      originalFileName: "noext",
      mimeType: "application/octet-stream",
    };
    const result = await provider.save(input);
    expect(result.storageKey).toContain("abcdef1234567890.bin");
  });

  it("delete handles missing file gracefully", async () => {
    mockUnlink.mockRejectedValue(new Error("ENOENT"));
    const provider = new LocalStorageProvider("/uploads");
    await expect(provider.delete("/uploads/nonexistent.jpg")).resolves.not.toThrow();
  });

  it("delete calls fs.unlink with correct path", async () => {
    mockUnlink.mockResolvedValue(undefined);
    const provider = new LocalStorageProvider("/uploads");
    await provider.delete("/uploads/some-file.jpg");
    expect(mockUnlink).toHaveBeenCalledWith("/uploads/some-file.jpg");
  });
});
