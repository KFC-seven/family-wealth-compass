import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("getPushProvider", () => {
  beforeEach(() => {
    delete process.env.WECHAT_PUSH_PROVIDER;
    delete process.env.WECHAT_PUSH_ENABLED;
    delete process.env.SERVER_CHAN_SEND_KEY;
    delete process.env.WECHAT_WORK_WEBHOOK_URL;
  });

  afterEach(() => {
    delete process.env.WECHAT_PUSH_PROVIDER;
    delete process.env.WECHAT_PUSH_ENABLED;
    delete process.env.SERVER_CHAN_SEND_KEY;
    delete process.env.WECHAT_WORK_WEBHOOK_URL;
    vi.resetModules();
  });

  it("returns MockPushProvider when WECHAT_PUSH_PROVIDER=mock", async () => {
    process.env.WECHAT_PUSH_PROVIDER = "mock";
    const { getPushProvider } = await import("../registry");
    const provider = getPushProvider();
    expect(provider.name).toBe("mock");
  });

  it("returns MockPushProvider when WECHAT_PUSH_PROVIDER is not set", async () => {
    const { getPushProvider } = await import("../registry");
    const provider = getPushProvider();
    expect(provider.name).toBe("mock");
  });

  it("returns WeComBotProvider when configured", async () => {
    process.env.WECHAT_PUSH_PROVIDER = "wecom-bot";
    process.env.WECHAT_PUSH_ENABLED = "true";
    process.env.WECHAT_WORK_WEBHOOK_URL = "https://qyapi.weixin.qq.com/webhook/send?key=xxx";
    const { getPushProvider } = await import("../registry");
    const provider = getPushProvider();
    expect(provider.name).toBe("wecom-bot");
  });

  it("falls back to Mock when wecom-bot not configured", async () => {
    process.env.WECHAT_PUSH_PROVIDER = "wecom-bot";
    // missing webhook
    const { getPushProvider } = await import("../registry");
    const provider = getPushProvider();
    expect(provider.name).toBe("mock");
  });

  it("returns ServerChanProvider when configured", async () => {
    process.env.WECHAT_PUSH_PROVIDER = "server-chan";
    process.env.WECHAT_PUSH_ENABLED = "true";
    process.env.SERVER_CHAN_SEND_KEY = "test-key";
    const { getPushProvider } = await import("../registry");
    const provider = getPushProvider();
    expect(provider.name).toBe("server-chan");
  });

  it("falls back to Mock when server-chan not configured", async () => {
    process.env.WECHAT_PUSH_PROVIDER = "server-chan";
    // missing key
    const { getPushProvider } = await import("../registry");
    const provider = getPushProvider();
    expect(provider.name).toBe("mock");
  });
});
