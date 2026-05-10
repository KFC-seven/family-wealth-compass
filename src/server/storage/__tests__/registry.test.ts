import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getStorageProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.UPLOAD_STORAGE_PROVIDER;
    delete process.env.ALIYUN_ACCESS_KEY_ID;
    delete process.env.ALIYUN_ACCESS_KEY_SECRET;
    delete process.env.ALIYUN_OSS_BUCKET;
    delete process.env.ALIYUN_OSS_ENDPOINT;
  });

  it("returns LocalStorageProvider by default", async () => {
    const { getStorageProvider } = await import("../registry");
    const provider = getStorageProvider();
    expect(provider.name).toBe("local");
  });

  it("falls back to local when aliyun-oss is not configured", async () => {
    process.env.UPLOAD_STORAGE_PROVIDER = "aliyun-oss";
    const { getStorageProvider } = await import("../registry");
    const provider = getStorageProvider();
    expect(provider.name).toBe("local");
  });

  it("caches the provider instance", async () => {
    const { getStorageProvider } = await import("../registry");
    const p1 = getStorageProvider();
    const p2 = getStorageProvider();
    expect(p1).toBe(p2);
  });
});

describe("AliyunOssStorageProvider", () => {
  beforeEach(() => {
    delete process.env.ALIYUN_ACCESS_KEY_ID;
    delete process.env.ALIYUN_ACCESS_KEY_SECRET;
    delete process.env.ALIYUN_OSS_BUCKET;
    delete process.env.ALIYUN_OSS_ENDPOINT;
  });

  it("isEnabled is false without config", async () => {
    const { AliyunOssStorageProvider } = await import("../providers/aliyun-oss-storage-provider");
    const provider = new AliyunOssStorageProvider();
    expect(provider.isEnabled).toBe(false);
  });

  it("isEnabled is true when fully configured", async () => {
    process.env.ALIYUN_ACCESS_KEY_ID = "id";
    process.env.ALIYUN_ACCESS_KEY_SECRET = "secret";
    process.env.ALIYUN_OSS_BUCKET = "bucket";
    process.env.ALIYUN_OSS_ENDPOINT = "endpoint";
    const { AliyunOssStorageProvider } = await import("../providers/aliyun-oss-storage-provider");
    const provider = new AliyunOssStorageProvider();
    expect(provider.isEnabled).toBe(true);
  });

  it("save throws not implemented", async () => {
    const { AliyunOssStorageProvider } = await import("../providers/aliyun-oss-storage-provider");
    const provider = new AliyunOssStorageProvider();
    await expect(
      provider.save({
        buffer: Buffer.from("test"),
        originalFileName: "test.jpg",
        mimeType: "image/jpeg",
      }),
    ).rejects.toThrow("未实现");
  });
});
