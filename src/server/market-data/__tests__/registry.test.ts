import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    marketDataSource: { findMany: vi.fn() },
    priceSnapshot: { findFirst: vi.fn() },
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));

import {
  getAllProviders,
  getProvider,
  resolveProviderForAsset,
  safeGetPrice,
  healthCheckAll,
} from "../registry";
import type { MarketAsset, MarketPriceResult, MarketDataProviderHealth } from "../types";

function makeAsset(overrides: Partial<MarketAsset> = {}): MarketAsset {
  return {
    id: "ast-001",
    code: "600519",
    type: "A_SHARE" as any,
    currency: "CNY",
    ...overrides,
  };
}

function makeSinaCSV(symbol: string, price: number): string {
  return `var hq_str_${symbol}="NAME,42.0,42.2,${price},42.8,41.9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0";`;
}

function makeEastmoneyJSONP(): string {
  return 'jsonpgz({"dwjz":"1.2345","jzrq":"2026-05-10"});';
}

describe("Registry", () => {
  beforeAll(() => {
    // Enable providers that depend on env vars BEFORE initProviders runs
    process.env.MARKET_DATA_ENABLE_EASTMONEY_FUND = "true";
    process.env.MARKET_DATA_ENABLE_SINA_FINANCE = "true";
    process.env.MARKET_DATA_ENABLE_TUSHARE = "true";
    process.env.TUSHARE_TOKEN = "test-token";
  });

  beforeEach(() => {
    // Fresh fetch mock per test
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("ok"),
    }));
    // Reset DB mock
    mockPrisma.marketDataSource.findMany.mockReset();
    mockPrisma.marketDataSource.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.MARKET_DATA_MODE;
    delete process.env.MARKET_DATA_ENABLE_EASTMONEY_FUND;
    delete process.env.MARKET_DATA_ENABLE_SINA_FINANCE;
    delete process.env.MARKET_DATA_ENABLE_TUSHARE;
    delete process.env.TUSHARE_TOKEN;
  });

  describe("getAllProviders", () => {
    it("returns 5 providers", () => {
      const providers = getAllProviders();
      expect(providers).toHaveLength(5);
      const names = providers.map((p) => p.name).sort();
      expect(names).toEqual([
        "eastmoney-fund",
        "manual",
        "mock",
        "sina-finance",
        "tushare",
      ]);
    });
  });

  describe("getProvider", () => {
    it("returns provider by name", () => {
      const p = getProvider("mock");
      expect(p).toBeDefined();
      expect(p!.name).toBe("mock");
    });

    it("returns undefined for nonexistent provider name", () => {
      expect(getProvider("nonexistent")).toBeUndefined();
    });
  });

  describe("resolveProviderForAsset", () => {
    it("returns mock provider when MARKET_DATA_MODE=mock", async () => {
      process.env.MARKET_DATA_MODE = "mock";
      const result = await resolveProviderForAsset(makeAsset());
      expect(result.provider.name).toBe("mock");
      expect(result.sourceName).toBe("mock");
      expect(result.fallback).toBe(false);
    });

    it("returns appropriate provider in mixed mode with DB sources", async () => {
      process.env.MARKET_DATA_MODE = "mixed";
      // Re-enable env vars for this test
      process.env.MARKET_DATA_ENABLE_SINA_FINANCE = "true";

      mockPrisma.marketDataSource.findMany.mockResolvedValue([
        {
          name: "sina-finance",
          supportedAssetTypes: ["A_SHARE", "ETF", "US_STOCK"],
          priority: 1,
        },
      ]);

      // Fetch is already stubbed to return ok; Sina health-check needs a proper CSV response
      // but resolveProviderForAsset only calls isEnabled(), not healthCheck()
      const result = await resolveProviderForAsset(makeAsset());
      expect(result.provider.name).toBe("sina-finance");
      expect(result.sourceName).toBe("sina-finance");
      expect(result.fallback).toBe(false);
    });

    it("falls back to mock when asset type not supported by any enabled provider", async () => {
      process.env.MARKET_DATA_MODE = "mixed";
      mockPrisma.marketDataSource.findMany.mockResolvedValue([
        {
          name: "eastmoney-fund",
          supportedAssetTypes: ["MUTUAL_FUND"],
          priority: 1,
        },
      ]);

      const result = await resolveProviderForAsset(
        makeAsset({ type: "BANK_WEALTH" as any }),
      );
      // eastmoney-fund doesn't support BANK_WEALTH, falls back to mock
      expect(result.provider.name).toBe("mock");
      expect(result.fallback).toBe(true);
    });

    it("falls back to mock when all DB providers are not found in registry", async () => {
      process.env.MARKET_DATA_MODE = "mixed";
      mockPrisma.marketDataSource.findMany.mockResolvedValue([
        {
          name: "nonexistent-provider",
          supportedAssetTypes: [],
          priority: 1,
        },
      ]);

      const result = await resolveProviderForAsset(makeAsset());
      expect(result.provider.name).toBe("mock");
      expect(result.fallback).toBe(true);
    });
  });

  describe("safeGetPrice", () => {
    it("returns price when provider succeeds", async () => {
      process.env.MARKET_DATA_MODE = "mock";
      const result = await safeGetPrice(makeAsset());
      expect(result.price).toBeGreaterThan(0);
      expect(result.source).toBe("mock");
      expect(result.assetCode).toBe("600519");
    });

    it("falls back to mock when provider throws", async () => {
      process.env.MARKET_DATA_MODE = "mixed";
      process.env.MARKET_DATA_ENABLE_TUSHARE = "true";
      process.env.TUSHARE_TOKEN = "test-token";

      mockPrisma.marketDataSource.findMany.mockResolvedValue([
        {
          name: "tushare",
          supportedAssetTypes: ["A_SHARE"],
          priority: 1,
        },
      ]);

      // TushareProvider.getLatestPrice always throws; safeGetPrice should fallback to mock
      const result = await safeGetPrice(makeAsset());
      expect(result.source).toBe("mock");
      expect(result.price).toBeGreaterThan(0);
    });
  });

  describe("healthCheckAll", () => {
    it("returns results for all 5 providers", async () => {
      // mock and manual don't need fetch; eastmoney and sina need fetch
      // Eastmoney healthCheck just checks resp.ok, Sina healthCheck parses CSV
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(makeSinaCSV("sh600519", 1900.0)),
      });
      vi.stubGlobal("fetch", fetchMock);

      // Re-enable env vars
      process.env.MARKET_DATA_ENABLE_EASTMONEY_FUND = "true";
      process.env.MARKET_DATA_ENABLE_SINA_FINANCE = "true";
      process.env.MARKET_DATA_ENABLE_TUSHARE = "true";
      process.env.TUSHARE_TOKEN = "test-token";

      // Re-init providers by calling a registry function first
      const results = await healthCheckAll();
      expect(Object.keys(results)).toHaveLength(5);
      expect(results["mock"]).toBeDefined();
      expect(results["manual"]).toBeDefined();
      expect(results["eastmoney-fund"]).toBeDefined();
      expect(results["sina-finance"]).toBeDefined();
      expect(results["tushare"]).toBeDefined();
    });

    it("reports FAILED for a provider whose healthCheck throws", async () => {
      // Stub fetch to succeed for eastmoney but let's spy on the mock provider
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(makeSinaCSV("sh600519", 1900.0)),
      });
      vi.stubGlobal("fetch", fetchMock);

      process.env.MARKET_DATA_ENABLE_EASTMONEY_FUND = "true";
      process.env.MARKET_DATA_ENABLE_SINA_FINANCE = "true";
      process.env.MARKET_DATA_ENABLE_TUSHARE = "true";
      process.env.TUSHARE_TOKEN = "test-token";

      // Force the mock provider to throw
      const mockProvider = getProvider("mock")!;
      vi.spyOn(mockProvider, "healthCheck").mockRejectedValue(
        new Error("simulated failure"),
      );

      const results = await healthCheckAll();
      expect(results["mock"].status).toBe("FAILED");
      expect(results["mock"].message).toContain("simulated failure");

      // Other providers should still report their status
      expect(results["manual"].status).toBe("HEALTHY");
      expect(results["eastmoney-fund"]).toBeDefined();
      expect(results["sina-finance"]).toBeDefined();
      expect(results["tushare"]).toBeDefined();
    });
  });
});
