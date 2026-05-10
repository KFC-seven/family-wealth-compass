import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AliyunBailianProvider } from "../providers/aliyun-bailian-provider";
import type { AiBriefInput } from "../types";

const dummyInput: AiBriefInput = {
  householdName: "Test",
  baseCurrency: "CNY",
  date: "2026-05-11",
  totalAssets: 0,
  dailyReturn: 0,
  cumulativeReturn: 0,
  holdingReturn: 0,
  realizedReturn: 0,
  cashBalance: 0,
  members: [],
  riskSignals: [],
  newsHighlights: [],
  marketSummary: "",
};

describe("AliyunBailianProvider", () => {
  beforeEach(() => {
    delete process.env.AI_ENABLED;
    delete process.env.AI_PROVIDER;
    delete process.env.ALIYUN_BAILIAN_API_KEY;
  });

  afterEach(() => {
    delete process.env.AI_ENABLED;
    delete process.env.AI_PROVIDER;
    delete process.env.ALIYUN_BAILIAN_API_KEY;
  });

  it("name is 'aliyun-bailian'", () => {
    const provider = new AliyunBailianProvider();
    expect(provider.name).toBe("aliyun-bailian");
  });

  it("isEnabled returns false when not configured", () => {
    const provider = new AliyunBailianProvider();
    expect(provider.isEnabled()).toBe(false);
  });

  it("isEnabled returns true when fully configured", () => {
    process.env.AI_ENABLED = "true";
    process.env.AI_PROVIDER = "aliyun-bailian";
    process.env.ALIYUN_BAILIAN_API_KEY = "test-key";
    const provider = new AliyunBailianProvider();
    expect(provider.isEnabled()).toBe(true);
  });

  it("isEnabled returns false when AI_ENABLED is not 'true'", () => {
    process.env.AI_ENABLED = "false";
    process.env.AI_PROVIDER = "aliyun-bailian";
    process.env.ALIYUN_BAILIAN_API_KEY = "test-key";
    const provider = new AliyunBailianProvider();
    expect(provider.isEnabled()).toBe(false);
  });

  it("generateStructuredBrief throws not implemented error", async () => {
    const provider = new AliyunBailianProvider();
    await expect(provider.generateStructuredBrief(dummyInput)).rejects.toThrow("未实现");
  });

  it("healthCheck returns DISABLED when not configured", async () => {
    const provider = new AliyunBailianProvider();
    const health = await provider.healthCheck!();
    expect(health.status).toBe("DISABLED");
  });

  it("healthCheck returns DEGRADED when configured", async () => {
    process.env.AI_ENABLED = "true";
    process.env.AI_PROVIDER = "aliyun-bailian";
    process.env.ALIYUN_BAILIAN_API_KEY = "test-key";
    const provider = new AliyunBailianProvider();
    const health = await provider.healthCheck!();
    expect(health.status).toBe("DEGRADED");
  });
});
