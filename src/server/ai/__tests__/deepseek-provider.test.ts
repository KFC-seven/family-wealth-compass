import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DeepSeekProvider } from "../providers/deepseek-provider";
import type { AiBriefInput } from "../types";

const validInput: AiBriefInput = {
  householdName: "Test",
  baseCurrency: "CNY",
  date: "2026-05-11",
  totalAssets: 1000000,
  dailyReturn: 5000,
  cumulativeReturn: 50000,
  holdingReturn: 30000,
  realizedReturn: 20000,
  cashBalance: 100000,
  members: [],
  riskSignals: [],
  newsHighlights: [],
  marketSummary: "平稳",
};

const validApiResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        title: "每日简报",
        summary: "今日市场平稳",
        marketOverview: [{ market: "A股", direction: "neutral", summary: "平稳" }],
        householdImpact: { direction: "neutral", summary: "平稳", mainContributors: [], mainRisks: [] },
        memberImpacts: [],
        riskAlerts: [],
        adviceCards: [],
        newsItems: [],
        disclaimer: "不构成确定性投资指令",
      }),
    },
  }],
};

let mockFetch: ReturnType<typeof vi.fn>;

describe("DeepSeekProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockFetch = vi.mocked(globalThis.fetch);

    process.env.AI_ENABLED = "true";
    process.env.AI_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "test-key-12345";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.AI_ENABLED;
    delete process.env.AI_PROVIDER;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_BASE_URL;
    delete process.env.AI_MODEL;
    delete process.env.AI_REQUEST_TIMEOUT_MS;
    delete process.env.AI_MAX_RETRIES;
  });

  describe("isEnabled", () => {
    it("returns true when all env vars are set", () => {
      const provider = new DeepSeekProvider();
      expect(provider.isEnabled()).toBe(true);
    });

    it("returns false when AI_ENABLED is not 'true'", () => {
      process.env.AI_ENABLED = "false";
      const provider = new DeepSeekProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("returns false when AI_PROVIDER is not 'deepseek'", () => {
      process.env.AI_PROVIDER = "mock";
      const provider = new DeepSeekProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("returns false when DEEPSEEK_API_KEY is missing", () => {
      delete process.env.DEEPSEEK_API_KEY;
      const provider = new DeepSeekProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("returns false when AI_ENABLED is missing", () => {
      delete process.env.AI_ENABLED;
      const provider = new DeepSeekProvider();
      expect(provider.isEnabled()).toBe(false);
    });
  });

  describe("healthCheck", () => {
    it("returns DEGRADED when enabled", async () => {
      const provider = new DeepSeekProvider();
      const health = await provider.healthCheck!();
      expect(health.status).toBe("DEGRADED");
      expect(health.message).toContain("配置已检测");
    });

    it("returns DISABLED when not enabled", async () => {
      delete process.env.DEEPSEEK_API_KEY;
      const provider = new DeepSeekProvider();
      const health = await provider.healthCheck!();
      expect(health.status).toBe("DISABLED");
      expect(health.message).toContain("未启用");
    });
  });

  describe("generateStructuredBrief", () => {
    it("returns validated AiBriefOutput on successful API call", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validApiResponse),
        text: () => Promise.resolve(""),
      });

      const provider = new DeepSeekProvider();
      const result = await provider.generateStructuredBrief(validInput);

      expect(result.title).toBe("每日简报");
      expect(result.summary).toBe("今日市场平稳");
      expect(result.disclaimer).toContain("不构成确定性投资指令");
    });

    it("throws when API returns non-200 after retries", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      const provider = new DeepSeekProvider();
      await expect(provider.generateStructuredBrief(validInput)).rejects.toThrow("DeepSeek");
      expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("throws when API returns empty content", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "" } }] }),
        text: () => Promise.resolve(""),
      });

      const provider = new DeepSeekProvider();
      await expect(provider.generateStructuredBrief(validInput)).rejects.toThrow("返回内容为空");
    });

    it("throws when API returns no choices", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
      });

      const provider = new DeepSeekProvider();
      await expect(provider.generateStructuredBrief(validInput)).rejects.toThrow("返回内容为空");
    });

    it("throws when API returns invalid JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: "这不是JSON" } }],
        }),
        text: () => Promise.resolve(""),
      });

      const provider = new DeepSeekProvider();
      await expect(provider.generateStructuredBrief(validInput)).rejects.toThrow("DeepSeek");
    });

    it("throws when API returns valid JSON but fails Zod validation", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                title: "", // empty title -> fails validation
                summary: "test",
                marketOverview: [],
                householdImpact: { direction: "neutral", summary: "", mainContributors: [], mainRisks: [] },
                memberImpacts: [],
                riskAlerts: [],
                adviceCards: [],
                newsItems: [],
                disclaimer: "",
              }),
            },
          }],
        }),
        text: () => Promise.resolve(""),
      });

      const provider = new DeepSeekProvider();
      await expect(provider.generateStructuredBrief(validInput)).rejects.toThrow();
    });

    it("retries on failure: maxRetries=2, total attempts=3", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server Error"),
      });

      const provider = new DeepSeekProvider();
      await expect(provider.generateStructuredBrief(validInput)).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("sends correct fetch request with proper headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validApiResponse),
        text: () => Promise.resolve(""),
      });

      const provider = new DeepSeekProvider();
      await provider.generateStructuredBrief(validInput);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("api.deepseek.com/v1/chat/completions");
      expect(options.method).toBe("POST");
      expect(options.headers.Authorization).toBe("Bearer test-key-12345");
      expect(options.headers["Content-Type"]).toBe("application/json");

      const body = JSON.parse(options.body);
      expect(body.model).toBe("deepseek-chat");
      expect(body.temperature).toBe(0.3);
      expect(body.max_tokens).toBe(4096);
      expect(body.response_format.type).toBe("json_object");
    });

    it("succeeds on retry after first failure", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validApiResponse),
          text: () => Promise.resolve(""),
        });

      const provider = new DeepSeekProvider();
      const result = await provider.generateStructuredBrief(validInput);

      expect(result.title).toBe("每日简报");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("uses custom base URL and model when configured", async () => {
      process.env.DEEPSEEK_BASE_URL = "https://custom.deepseek.com";
      process.env.AI_MODEL = "custom-model";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validApiResponse),
        text: () => Promise.resolve(""),
      });

      const provider = new DeepSeekProvider();
      await provider.generateStructuredBrief(validInput);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("custom.deepseek.com");
      const body = JSON.parse(options.body);
      expect(body.model).toBe("custom-model");
    });
  });
});
