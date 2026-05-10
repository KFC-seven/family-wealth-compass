import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getOcrProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.OCR_PROVIDER;
    delete process.env.OCR_ENABLED;
    delete process.env.ALIYUN_ACCESS_KEY_ID;
    delete process.env.ALIYUN_ACCESS_KEY_SECRET;
    delete process.env.ALIYUN_OCR_ENDPOINT;
  });

  it("returns MockOcrProvider by default", async () => {
    const { getOcrProvider } = await import("../registry");
    const provider = getOcrProvider();
    expect(provider.name).toBe("mock");
  });

  it("falls back to mock when aliyun env vars are missing", async () => {
    process.env.OCR_PROVIDER = "aliyun";
    process.env.OCR_ENABLED = "true";
    const { getOcrProvider } = await import("../registry");
    const provider = getOcrProvider();
    expect(provider.name).toBe("mock");
  });

  it("returns AliyunOcrProvider when fully configured", async () => {
    process.env.OCR_PROVIDER = "aliyun";
    process.env.OCR_ENABLED = "true";
    process.env.ALIYUN_ACCESS_KEY_ID = "test-key";
    process.env.ALIYUN_ACCESS_KEY_SECRET = "test-secret";
    process.env.ALIYUN_OCR_ENDPOINT = "https://ocr.aliyuncs.com";
    const { getOcrProvider } = await import("../registry");
    const provider = getOcrProvider();
    expect(provider.name).toBe("aliyun");
  });

  it("falls back to mock when OCR_ENABLED is false", async () => {
    process.env.OCR_PROVIDER = "aliyun";
    process.env.OCR_ENABLED = "false";
    process.env.ALIYUN_ACCESS_KEY_ID = "id";
    process.env.ALIYUN_ACCESS_KEY_SECRET = "secret";
    process.env.ALIYUN_OCR_ENDPOINT = "endpoint";
    const { getOcrProvider } = await import("../registry");
    const provider = getOcrProvider();
    expect(provider.name).toBe("mock");
  });

  it("caches the provider instance", async () => {
    const { getOcrProvider } = await import("../registry");
    const p1 = getOcrProvider();
    const p2 = getOcrProvider();
    expect(p1).toBe(p2);
  });
});

describe("MockOcrProvider", () => {
  it("recognizes ALIPAY platform rows", async () => {
    const { MockOcrProvider } = await import("../providers/mock-ocr-provider");
    const provider = new MockOcrProvider();
    const result = await provider.recognize({
      imageBuffer: Buffer.from("fake"),
      mimeType: "image/png",
      sourcePlatform: "ALIPAY" as any,
      fileName: "test.png",
    });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].account).toBe("支付宝基金账户");
    expect(result.provider).toBe("mock");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("recognizes BROKER platform rows", async () => {
    const { MockOcrProvider } = await import("../providers/mock-ocr-provider");
    const provider = new MockOcrProvider();
    const result = await provider.recognize({
      imageBuffer: Buffer.from("fake"),
      mimeType: "image/png",
      sourcePlatform: "BROKER" as any,
      fileName: "test.png",
    });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].account).toBe("华泰证券账户");
  });

  it("recognizes BANK platform rows", async () => {
    const { MockOcrProvider } = await import("../providers/mock-ocr-provider");
    const provider = new MockOcrProvider();
    const result = await provider.recognize({
      imageBuffer: Buffer.from("fake"),
      mimeType: "image/png",
      sourcePlatform: "BANK" as any,
      fileName: "test.png",
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].account).toBe("工商银行理财账户");
  });

  it("returns rows for OTHER platform", async () => {
    const { MockOcrProvider } = await import("../providers/mock-ocr-provider");
    const provider = new MockOcrProvider();
    const result = await provider.recognize({
      imageBuffer: Buffer.from("fake"),
      mimeType: "image/png",
      sourcePlatform: "OTHER" as any,
      fileName: "test.png",
    });
    expect(result.rows).toHaveLength(1);
  });

  it("simulates >= 250ms delay", async () => {
    const { MockOcrProvider } = await import("../providers/mock-ocr-provider");
    const provider = new MockOcrProvider();
    const start = Date.now();
    await provider.recognize({
      imageBuffer: Buffer.from("fake"),
      mimeType: "image/png",
      sourcePlatform: "ALIPAY" as any,
      fileName: "test.png",
    });
    expect(Date.now() - start).toBeGreaterThanOrEqual(250);
  });

  it("healthCheck returns HEALTHY", async () => {
    const { MockOcrProvider } = await import("../providers/mock-ocr-provider");
    const provider = new MockOcrProvider();
    const health = await provider.healthCheck!();
    expect(health.status).toBe("HEALTHY");
  });

  it("isEnabled returns true", async () => {
    const { MockOcrProvider } = await import("../providers/mock-ocr-provider");
    const provider = new MockOcrProvider();
    expect(provider.isEnabled()).toBe(true);
  });
});

describe("AliyunOcrProvider", () => {
  beforeEach(() => {
    delete process.env.OCR_PROVIDER;
    delete process.env.OCR_ENABLED;
    delete process.env.ALIYUN_ACCESS_KEY_ID;
    delete process.env.ALIYUN_ACCESS_KEY_SECRET;
    delete process.env.ALIYUN_OCR_ENDPOINT;
  });

  it("is not enabled without config", async () => {
    const { AliyunOcrProvider } = await import("../providers/aliyun-ocr-provider");
    const provider = new AliyunOcrProvider();
    expect(provider.isEnabled()).toBe(false);
  });

  it("is enabled when fully configured", async () => {
    process.env.OCR_PROVIDER = "aliyun";
    process.env.OCR_ENABLED = "true";
    process.env.ALIYUN_ACCESS_KEY_ID = "id";
    process.env.ALIYUN_ACCESS_KEY_SECRET = "secret";
    process.env.ALIYUN_OCR_ENDPOINT = "endpoint";
    const { AliyunOcrProvider } = await import("../providers/aliyun-ocr-provider");
    const provider = new AliyunOcrProvider();
    expect(provider.isEnabled()).toBe(true);
  });

  it("recognize throws not implemented", async () => {
    const { AliyunOcrProvider } = await import("../providers/aliyun-ocr-provider");
    const provider = new AliyunOcrProvider();
    await expect(
      provider.recognize({
        imageBuffer: Buffer.from("fake"),
        mimeType: "image/png",
        sourcePlatform: "ALIPAY" as any,
        fileName: "test.png",
      }),
    ).rejects.toThrow("未实现");
  });

  it("healthCheck returns DISABLED when not configured", async () => {
    const { AliyunOcrProvider } = await import("../providers/aliyun-ocr-provider");
    const provider = new AliyunOcrProvider();
    const health = await provider.healthCheck!();
    expect(health.status).toBe("DISABLED");
  });
});
