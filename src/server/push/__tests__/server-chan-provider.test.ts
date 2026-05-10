import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ServerChanProvider } from "../providers/server-chan-provider";
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

describe("ServerChanProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockFetch = vi.mocked(globalThis.fetch);

    process.env.WECHAT_PUSH_ENABLED = "true";
    process.env.WECHAT_PUSH_PROVIDER = "server-chan";
    process.env.SERVER_CHAN_SEND_KEY = "test-send-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WECHAT_PUSH_ENABLED;
    delete process.env.WECHAT_PUSH_PROVIDER;
    delete process.env.SERVER_CHAN_SEND_KEY;
  });

  describe("isEnabled", () => {
    it("returns true when all configured", () => {
      const provider = new ServerChanProvider();
      expect(provider.isEnabled()).toBe(true);
    });

    it("returns false when WECHAT_PUSH_ENABLED is not 'true'", () => {
      process.env.WECHAT_PUSH_ENABLED = "false";
      const provider = new ServerChanProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("returns false when WECHAT_PUSH_PROVIDER is wrong", () => {
      process.env.WECHAT_PUSH_PROVIDER = "wecom-bot";
      const provider = new ServerChanProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("returns false when SERVER_CHAN_SEND_KEY is missing", () => {
      delete process.env.SERVER_CHAN_SEND_KEY;
      const provider = new ServerChanProvider();
      expect(provider.isEnabled()).toBe(false);
    });
  });

  describe("sendDailyBrief", () => {
    it("returns success on successful API call", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 0, message: "success" }),
      });

      const provider = new ServerChanProvider();
      const result = await provider.sendDailyBrief(mockInput);

      expect(result.success).toBe(true);
      expect(result.provider).toBe("server-chan");
      expect(result.message).toContain("推送成功");
    });

    it("returns failure when disabled", async () => {
      process.env.WECHAT_PUSH_ENABLED = "false";
      const provider = new ServerChanProvider();
      const result = await provider.sendDailyBrief(mockInput);

      expect(result.success).toBe(false);
      expect(result.message).toContain("未启用");
    });

    it("returns failure when API returns error code", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 400, message: "invalid key" }),
      });

      const provider = new ServerChanProvider();
      const result = await provider.sendDailyBrief(mockInput);

      expect(result.success).toBe(false);
      expect(result.message).toContain("error");
    });

    it("returns failure on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      const provider = new ServerChanProvider();
      const result = await provider.sendDailyBrief(mockInput);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Network timeout");
    });

    it("sends correct request to ServerChan API", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 0, message: "success" }),
      });

      const provider = new ServerChanProvider();
      await provider.sendDailyBrief(mockInput);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("sctapi.ftqq.com");
      expect(url).toContain("test-send-key");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");

      const body = JSON.parse(options.body);
      expect(body.title).toBe(mockInput.title);
      expect(body.desp).toBeTruthy();
    });
  });

  describe("sendTest", () => {
    it("wraps sendDailyBrief with test data", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 0, message: "success" }),
      });

      const provider = new ServerChanProvider();
      const result = await provider.sendTest!();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("healthCheck", () => {
    it("returns DISABLED when not configured", async () => {
      process.env.WECHAT_PUSH_ENABLED = "false";
      const provider = new ServerChanProvider();
      const health = await provider.healthCheck!();
      expect(health.status).toBe("DISABLED");
    });

    it("returns DEGRADED when configured", async () => {
      const provider = new ServerChanProvider();
      const health = await provider.healthCheck!();
      expect(health.status).toBe("DEGRADED");
    });
  });
});
