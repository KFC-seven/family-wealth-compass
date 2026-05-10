import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { EastmoneyFundProvider } from "../providers/eastmoney-fund-provider";
import { ProviderUnavailableError, ProviderDataError } from "../errors";
import type { MarketAsset } from "../types";

const mockFundAsset: MarketAsset = {
  id: "fund-001",
  code: "000001",
  type: "MUTUAL_FUND" as any,
  currency: "CNY",
};

function mockFetchResponse(body: string, ok = true) {
  return {
    ok,
    text: () => Promise.resolve(body),
  };
}

describe("EastmoneyFundProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.MARKET_DATA_ENABLE_EASTMONEY_FUND;
  });

  describe("when disabled (default)", () => {
    it("isEnabled returns false by default", () => {
      const provider = new EastmoneyFundProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("getLatestPrice throws ProviderUnavailableError when disabled", async () => {
      const provider = new EastmoneyFundProvider();
      await expect(
        provider.getLatestPrice(mockFundAsset),
      ).rejects.toThrow(ProviderUnavailableError);
    });

    it("name is 'eastmoney-fund'", () => {
      const provider = new EastmoneyFundProvider();
      expect(provider.name).toBe("eastmoney-fund");
    });

    it("healthCheck returns DISABLED when not configured", async () => {
      const provider = new EastmoneyFundProvider();
      const health = await provider.healthCheck();
      expect(health.status).toBe("DISABLED");
    });
  });

  describe("when enabled", () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      process.env.MARKET_DATA_ENABLE_EASTMONEY_FUND = "true";
      mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);
    });

    it("getLatestPrice throws ProviderDataError for invalid code (< 6 chars)", async () => {
      const provider = new EastmoneyFundProvider();
      const shortAsset = { ...mockFundAsset, code: "123" };
      await expect(
        provider.getLatestPrice(shortAsset),
      ).rejects.toThrow(ProviderDataError);
    });

    it("getLatestPrice returns price for valid code", async () => {
      mockFetch.mockResolvedValue(
        mockFetchResponse('jsonpgz({"dwjz":"1.2345","jzrq":"2026-05-10","gszzl":"0.5"});'),
      );

      const provider = new EastmoneyFundProvider();
      const result = await provider.getLatestPrice(mockFundAsset);
      expect(result.price).toBe(1.2345);
      expect(result.assetCode).toBe("000001");
      expect(result.source).toBe("eastmoney");
      expect(result.confidence).toBe(0.9);
      expect(result.warning).toContain("0.5%");
      expect(result.raw).toBeDefined();
    });

    it("uses jjjz when dwjz is not available", async () => {
      mockFetch.mockResolvedValue(
        mockFetchResponse('jsonpgz({"jjjz":"2.3456","jzrq":"2026-05-10"});'),
      );

      const provider = new EastmoneyFundProvider();
      const result = await provider.getLatestPrice(mockFundAsset);
      expect(result.price).toBe(2.3456);
    });

    it("uses today date when jzrq is not available", async () => {
      mockFetch.mockResolvedValue(
        mockFetchResponse('jsonpgz({"dwjz":"1.5000"});'),
      );

      const provider = new EastmoneyFundProvider();
      const today = new Date().toISOString().slice(0, 10);
      const result = await provider.getLatestPrice(mockFundAsset);
      expect(result.priceDate).toBe(today);
    });

    it("throws ProviderDataError for zero NAV", async () => {
      mockFetch.mockResolvedValue(
        mockFetchResponse('jsonpgz({"dwjz":"0.0000","jzrq":"2026-05-10"});'),
      );

      const provider = new EastmoneyFundProvider();
      await expect(
        provider.getLatestPrice(mockFundAsset),
      ).rejects.toThrow(ProviderDataError);
    });

    it("throws ProviderDataError for malformed response (no JSONP)", async () => {
      mockFetch.mockResolvedValue(
        mockFetchResponse("not jsonp format"),
      );

      const provider = new EastmoneyFundProvider();
      await expect(
        provider.getLatestPrice(mockFundAsset),
      ).rejects.toThrow(ProviderDataError);
    });

    it("throws ProviderDataError for invalid JSON inside JSONP", async () => {
      mockFetch.mockResolvedValue(
        mockFetchResponse("jsonpgz({invalid json});"),
      );

      const provider = new EastmoneyFundProvider();
      await expect(
        provider.getLatestPrice(mockFundAsset),
      ).rejects.toThrow(ProviderUnavailableError);
    });

    it("throws ProviderUnavailableError for HTTP error response", async () => {
      mockFetch.mockResolvedValue(
        mockFetchResponse("Not Found", false),
      );

      const provider = new EastmoneyFundProvider();
      await expect(
        provider.getLatestPrice(mockFundAsset),
      ).rejects.toThrow(ProviderUnavailableError);
    });

    it("throws ProviderUnavailableError on network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));

      const provider = new EastmoneyFundProvider();
      await expect(
        provider.getLatestPrice(mockFundAsset),
      ).rejects.toThrow(ProviderUnavailableError);
    });

    it("healthCheck returns HEALTHY when fetch succeeds", async () => {
      mockFetch.mockResolvedValue(mockFetchResponse("ok"));

      const provider = new EastmoneyFundProvider();
      const health = await provider.healthCheck();
      expect(health.status).toBe("HEALTHY");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("healthCheck returns DEGRADED on HTTP error", async () => {
      mockFetch.mockResolvedValue(mockFetchResponse("error", false));

      const provider = new EastmoneyFundProvider();
      const health = await provider.healthCheck();
      expect(health.status).toBe("DEGRADED");
    });

    it("healthCheck returns FAILED on network error", async () => {
      mockFetch.mockRejectedValue(new Error("timeout"));

      const provider = new EastmoneyFundProvider();
      const health = await provider.healthCheck();
      expect(health.status).toBe("FAILED");
    });
  });
});
