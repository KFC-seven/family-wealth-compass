import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("getAiProvider", () => {
  beforeEach(() => {
    delete process.env.AI_PROVIDER;
    delete process.env.AI_ENABLED;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.ALIYUN_BAILIAN_API_KEY;
  });

  afterEach(() => {
    delete process.env.AI_PROVIDER;
    delete process.env.AI_ENABLED;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.ALIYUN_BAILIAN_API_KEY;
    vi.resetModules();
  });

  it("returns MockAiProvider when AI_PROVIDER=mock", async () => {
    process.env.AI_PROVIDER = "mock";
    const { getAiProvider } = await import("../registry");
    const provider = getAiProvider();
    expect(provider.name).toBe("mock");
  });

  it("returns MockAiProvider when AI_PROVIDER is not set", async () => {
    const { getAiProvider } = await import("../registry");
    const provider = getAiProvider();
    expect(provider.name).toBe("mock");
  });

  it("returns DeepSeekProvider when AI_PROVIDER=deepseek and configured", async () => {
    process.env.AI_PROVIDER = "deepseek";
    process.env.AI_ENABLED = "true";
    process.env.DEEPSEEK_API_KEY = "test-key";
    const { getAiProvider } = await import("../registry");
    const provider = getAiProvider();
    expect(provider.name).toBe("deepseek");
  });

  it("falls back to MockAiProvider when AI_PROVIDER=deepseek but not configured", async () => {
    process.env.AI_PROVIDER = "deepseek";
    // AI_ENABLED and DEEPSEEK_API_KEY not set
    const { getAiProvider } = await import("../registry");
    const provider = getAiProvider();
    expect(provider.name).toBe("mock");
  });

  it("returns AliyunBailianProvider when configured", async () => {
    process.env.AI_PROVIDER = "aliyun-bailian";
    process.env.AI_ENABLED = "true";
    process.env.ALIYUN_BAILIAN_API_KEY = "test-key";
    const { getAiProvider } = await import("../registry");
    const provider = getAiProvider();
    expect(provider.name).toBe("aliyun-bailian");
  });

  it("falls back to MockAiProvider when aliyun-bailian not configured", async () => {
    process.env.AI_PROVIDER = "aliyun-bailian";
    const { getAiProvider } = await import("../registry");
    const provider = getAiProvider();
    expect(provider.name).toBe("mock");
  });
});
