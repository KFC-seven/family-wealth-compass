import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { TushareProvider } from "../providers/tushare-provider";
import { ProviderUnavailableError } from "../errors";
import type { MarketAsset } from "../types";

const mockAsset: MarketAsset = {
  id: "ast-001",
  code: "600519",
  type: "A_SHARE" as any,
};

describe("TushareProvider", () => {
  afterEach(() => {
    delete process.env.MARKET_DATA_ENABLE_TUSHARE;
    delete process.env.TUSHARE_TOKEN;
  });

  it("name is 'tushare'", () => {
    const provider = new TushareProvider();
    expect(provider.name).toBe("tushare");
  });

  describe("when disabled (default)", () => {
    it("isEnabled returns false by default", () => {
      const provider = new TushareProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("getLatestPrice throws ProviderUnavailableError", async () => {
      const provider = new TushareProvider();
      await expect(
        provider.getLatestPrice(mockAsset),
      ).rejects.toThrow(ProviderUnavailableError);
    });

    it("healthCheck returns DISABLED when env not set", async () => {
      const provider = new TushareProvider();
      const health = await provider.healthCheck();
      expect(health.status).toBe("DISABLED");
    });
  });

  describe("when env var set but no token", () => {
    beforeEach(() => {
      process.env.MARKET_DATA_ENABLE_TUSHARE = "true";
    });

    it("isEnabled returns false (no token)", () => {
      const provider = new TushareProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("healthCheck returns DISABLED (token not configured)", async () => {
      const provider = new TushareProvider();
      const health = await provider.healthCheck();
      expect(health.status).toBe("DISABLED");
      expect(health.message).toContain("TUSHARE_TOKEN");
    });
  });

  describe("when fully configured", () => {
    beforeEach(() => {
      process.env.MARKET_DATA_ENABLE_TUSHARE = "true";
      process.env.TUSHARE_TOKEN = "test-token-123";
    });

    it("isEnabled returns true", () => {
      const provider = new TushareProvider();
      expect(provider.isEnabled()).toBe(true);
    });

    it("getLatestPrice still throws (skeleton)", async () => {
      const provider = new TushareProvider();
      await expect(
        provider.getLatestPrice(mockAsset),
      ).rejects.toThrow(ProviderUnavailableError);
    });

    it("healthCheck returns DEGRADED (skeleton)", async () => {
      const provider = new TushareProvider();
      const health = await provider.healthCheck();
      expect(health.status).toBe("DEGRADED");
    });
  });
});
