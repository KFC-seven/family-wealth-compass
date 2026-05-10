import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WeComBotProvider } from "../providers/wecom-bot-provider";
import type { PushDailyBriefInput } from "../types";

const mockInput: PushDailyBriefInput = {
  title: "每日简报",
  summary: "市场平稳运行",
  dailyReturn: 5000,
  riskAlerts: [],
  adviceCards: [],
  includeTotalAssets: false,
  includeMemberDetails: false,
  includeAiAdvice: false,
  onlyHighRisk: false,
};

let mockFetch: ReturnType<typeof vi.fn>;

describe("WeComBotProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockFetch = vi.mocked(globalThis.fetch);

    process.env.WECHAT_PUSH_ENABLED = "true";
    process.env.WECHAT_PUSH_PROVIDER = "wecom-bot";
    process.env.WECHAT_WORK_WEBHOOK_URL = "https://qyapi.weixin.qq.com/webhook/send?key=test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WECHAT_PUSH_ENABLED;
    delete process.env.WECHAT_PUSH_PROVIDER;
    delete process.env.WECHAT_WORK_WEBHOOK_URL;
  });

  describe("isEnabled", () => {
    it("returns true when all configured", () => {
      const provider = new WeComBotProvider();
      expect(provider.isEnabled()).toBe(true);
    });

    it("returns false when WECHAT_PUSH_ENABLED is not 'true'", () => {
      process.env.WECHAT_PUSH_ENABLED = "false";
      const provider = new WeComBotProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("returns false when WECHAT_PUSH_PROVIDER is wrong", () => {
      process.env.WECHAT_PUSH_PROVIDER = "server-chan";
      const provider = new WeComBotProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("returns false when webhook URL is missing", () => {
      delete process.env.WECHAT_WORK_WEBHOOK_URL;
      const provider = new WeComBotProvider();
      expect(provider.isEnabled()).toBe(false);
    });
  });

  describe("sendDailyBrief", () => {
    it("returns success on successful API call", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: "ok" }),
      });

      const provider = new WeComBotProvider();
      const result = await provider.sendDailyBrief(mockInput);

      expect(result.success).toBe(true);
      expect(result.provider).toBe("wecom-bot");
      expect(result.message).toContain("推送成功");
    });

    it("returns failure when disabled", async () => {
      process.env.WECHAT_PUSH_ENABLED = "false";
      const provider = new WeComBotProvider();
      const result = await provider.sendDailyBrief(mockInput);

      expect(result.success).toBe(false);
      expect(result.message).toContain("未启用");
    });

    it("returns failure when API returns non-zero errcode", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 40009, errmsg: "invalid webhook" }),
      });

      const provider = new WeComBotProvider();
      const result = await provider.sendDailyBrief(mockInput);

      expect(result.success).toBe(false);
      expect(result.message).toContain("error");
    });

    it("returns failure on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const provider = new WeComBotProvider();
      const result = await provider.sendDailyBrief(mockInput);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Connection refused");
    });

    it("sends markdown format to correct webhook URL", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: "ok" }),
      });

      const provider = new WeComBotProvider();
      await provider.sendDailyBrief(mockInput);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("qyapi.weixin.qq.com");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");

      const body = JSON.parse(options.body);
      expect(body.msgtype).toBe("markdown");
      expect(body.markdown.content).toBeTruthy();
    });
  });

  describe("sendTest", () => {
    it("wraps sendDailyBrief with test data", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: "ok" }),
      });

      const provider = new WeComBotProvider();
      const result = await provider.sendTest!();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("healthCheck", () => {
    it("returns DISABLED when not configured", async () => {
      process.env.WECHAT_PUSH_ENABLED = "false";
      const provider = new WeComBotProvider();
      const health = await provider.healthCheck!();
      expect(health.status).toBe("DISABLED");
    });

    it("returns DEGRADED when configured", async () => {
      const provider = new WeComBotProvider();
      const health = await provider.healthCheck!();
      expect(health.status).toBe("DEGRADED");
    });
  });
});
