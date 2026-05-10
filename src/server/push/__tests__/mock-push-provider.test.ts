import { describe, it, expect, beforeEach } from "vitest";
import { MockPushProvider } from "../providers/mock-push-provider";
import type { PushDailyBriefInput } from "../types";

describe("MockPushProvider", () => {
  let provider: MockPushProvider;

  beforeEach(() => {
    provider = new MockPushProvider();
  });

  it("name is 'mock'", () => {
    expect(provider.name).toBe("mock");
  });

  it("isEnabled returns true", () => {
    expect(provider.isEnabled()).toBe(true);
  });

  it("sendDailyBrief returns success", async () => {
    const input: PushDailyBriefInput = {
      title: "测试简报",
      summary: "测试摘要",
      dailyReturn: 1000,
      riskAlerts: [],
      adviceCards: [],
      includeTotalAssets: false,
      includeMemberDetails: false,
      includeAiAdvice: false,
      onlyHighRisk: false,
    };

    const result = await provider.sendDailyBrief(input);
    expect(result.success).toBe(true);
    expect(result.provider).toBe("mock");
    expect(result.message).toContain("Mock 推送成功");
    expect(result.sentAt).toBeTruthy();
  });

  it("sendTest returns success", async () => {
    const result = await provider.sendTest!();
    expect(result.success).toBe(true);
    expect(result.provider).toBe("mock");
    expect(result.message).toContain("Mock 测试推送成功");
  });

  it("healthCheck returns HEALTHY", async () => {
    const health = await provider.healthCheck!();
    expect(health.status).toBe("HEALTHY");
    expect(health.message).toBe("Mock push 始终可用");
    expect(health.checkedAt).toBeTruthy();
  });
});
