import { describe, it, expect } from "vitest";
import { MockMarketDataProvider } from "../providers/mock-provider";
import type { MarketAsset } from "../types";

const basePrices: Record<string, number> = {
  CASH: 1,
  A_SHARE: 42.15,
  US_STOCK: 198.5,
  ETF: 3.85,
  MUTUAL_FUND: 1.234,
  BANK_WEALTH: 1,
  GOLD_ACCUMULATION: 512.3,
  BOND: 100,
  OTHER: 1,
};

function makeAsset(type: string): MarketAsset {
  return { id: `id-${type}`, code: "000001", type: type as any };
}

describe("MockMarketDataProvider", () => {
  it("can be constructed without seed", () => {
    const provider = new MockMarketDataProvider();
    expect(provider).toBeInstanceOf(MockMarketDataProvider);
  });

  it("can be constructed with seed parameter", () => {
    const provider = new MockMarketDataProvider(42);
    expect(provider).toBeInstanceOf(MockMarketDataProvider);
    expect(provider.name).toBe("mock");
  });

  it("isEnabled returns true", () => {
    const provider = new MockMarketDataProvider();
    expect(provider.isEnabled()).toBe(true);
  });

  it("name is 'mock' and supports all asset types", () => {
    const provider = new MockMarketDataProvider();
    expect(provider.name).toBe("mock");
    expect(provider.supportedAssetTypes).toContain("CASH");
    expect(provider.supportedAssetTypes).toContain("A_SHARE");
    expect(provider.supportedAssetTypes).toContain("US_STOCK");
    expect(provider.supportedAssetTypes).toContain("ETF");
    expect(provider.supportedAssetTypes).toContain("MUTUAL_FUND");
    expect(provider.supportedAssetTypes).toContain("BANK_WEALTH");
    expect(provider.supportedAssetTypes).toContain("GOLD_ACCUMULATION");
    expect(provider.supportedAssetTypes).toContain("BOND");
    expect(provider.supportedAssetTypes).toContain("OTHER");
  });

  it.each([
    "CASH",
    "A_SHARE",
    "US_STOCK",
    "ETF",
    "MUTUAL_FUND",
    "BANK_WEALTH",
    "GOLD_ACCUMULATION",
    "BOND",
    "OTHER",
  ])("getLatestPrice for %s returns price within +/-1%% of base", async (type) => {
    const provider = new MockMarketDataProvider();
    const base = basePrices[type];
    const results = await Promise.all(
      Array.from({ length: 20 }, () => provider.getLatestPrice(makeAsset(type))),
    );
    for (const r of results) {
      expect(r.price).toBeGreaterThanOrEqual(base * 0.99);
      expect(r.price).toBeLessThanOrEqual(base * 1.01);
      expect(r.assetType).toBe(type);
      expect(r.currency).toBe("CNY");
      expect(r.source).toBe("mock");
      expect(r.confidence).toBe(1);
    }
  });

  it("returns different prices for different asset types", async () => {
    const provider = new MockMarketDataProvider();
    const aShare = await provider.getLatestPrice(makeAsset("A_SHARE"));
    const usStock = await provider.getLatestPrice(makeAsset("US_STOCK"));
    expect(aShare.price).not.toBe(usStock.price);
  });

  it("uses asset currency when provided", async () => {
    const provider = new MockMarketDataProvider();
    const asset: MarketAsset = { id: "1", code: "AAPL", type: "US_STOCK" as any, currency: "USD" };
    const result = await provider.getLatestPrice(asset);
    expect(result.currency).toBe("USD");
  });

  it("returns correct priceDate (today)", async () => {
    const provider = new MockMarketDataProvider();
    const today = new Date().toISOString().slice(0, 10);
    const result = await provider.getLatestPrice(makeAsset("A_SHARE"));
    expect(result.priceDate).toBe(today);
  });

  it("healthCheck returns HEALTHY", async () => {
    const provider = new MockMarketDataProvider();
    const health = await provider.healthCheck();
    expect(health.status).toBe("HEALTHY");
    expect(health.checkedAt).toBeDefined();
  });
});
