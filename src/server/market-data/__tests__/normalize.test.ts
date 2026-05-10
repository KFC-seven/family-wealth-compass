import { describe, it, expect } from "vitest";
import {
  deduplicateResults,
  normalizeCurrency,
  isValidPrice,
  assetTypeLabel,
} from "../normalize";
import type { MarketPriceResult } from "../types";

function makeResult(
  overrides: Partial<MarketPriceResult> = {},
): MarketPriceResult {
  return {
    assetId: "ast-001",
    assetCode: "600519",
    assetType: "A_SHARE" as any,
    price: 42.5,
    currency: "CNY",
    priceDate: "2026-05-11",
    source: "mock",
    ...overrides,
  };
}

describe("deduplicateResults", () => {
  it("deduplicates on composite key assetId+priceDate, first entry wins for same key", () => {
    const results = [
      makeResult({ assetId: "a1", priceDate: "2026-05-10", price: 100 }),
      makeResult({ assetId: "a1", priceDate: "2026-05-10", price: 99 }),
      makeResult({ assetId: "a2", priceDate: "2026-05-10", price: 200 }),
    ];
    const deduped = deduplicateResults(results);
    expect(deduped).toHaveLength(2);
    // a1:2026-05-10 is deduplicated, first entry (price 100) is kept
    const a1 = deduped.find((r) => r.assetId === "a1")!;
    expect(a1.price).toBe(100);
  });

  it("keeps separate entries for same assetId with different dates", () => {
    const results = [
      makeResult({ assetId: "a1", priceDate: "2026-05-10", price: 100 }),
      makeResult({ assetId: "a1", priceDate: "2026-05-11", price: 101 }),
    ];
    // Different composite keys -> both kept
    expect(deduplicateResults(results)).toHaveLength(2);
  });

  it("filters out invalid prices (<= 0)", () => {
    const results = [
      makeResult({ price: 42.5 }),
      makeResult({ price: 0 }),
      makeResult({ price: -1 }),
    ];
    const deduped = deduplicateResults(results);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].price).toBe(42.5);
  });

  it("returns all results unchanged when no duplicates or invalid prices", () => {
    const results = [
      makeResult({ assetId: "a1", priceDate: "2026-05-10" }),
      makeResult({ assetId: "a2", priceDate: "2026-05-10" }),
      makeResult({ assetId: "a3", priceDate: "2026-05-11" }),
    ];
    expect(deduplicateResults(results)).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    expect(deduplicateResults([])).toEqual([]);
  });
});

describe("normalizeCurrency", () => {
  it("returns CNY for CNY", () => {
    expect(normalizeCurrency("CNY", "USD")).toBe("CNY");
  });

  it("returns CNY for RMB", () => {
    expect(normalizeCurrency("RMB", "USD")).toBe("CNY");
  });

  it("returns USD for USD", () => {
    expect(normalizeCurrency("USD", "CNY")).toBe("USD");
  });

  it("returns HKD for HKD", () => {
    expect(normalizeCurrency("HKD", "CNY")).toBe("HKD");
  });

  it("returns fallback for undefined", () => {
    expect(normalizeCurrency(undefined, "CNY")).toBe("CNY");
  });

  it("returns fallback for unknown currency code", () => {
    expect(normalizeCurrency("gbp", "CNY")).toBe("CNY");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(normalizeCurrency("  cny ", "USD")).toBe("CNY");
    expect(normalizeCurrency("  rMb  ", "USD")).toBe("CNY");
  });
});

describe("isValidPrice", () => {
  it("returns true for positive finite numbers", () => {
    expect(isValidPrice(100)).toBe(true);
    expect(isValidPrice(0.01)).toBe(true);
    expect(isValidPrice(1)).toBe(true);
  });

  it("returns false for zero", () => {
    expect(isValidPrice(0)).toBe(false);
  });

  it("returns false for negative numbers", () => {
    expect(isValidPrice(-1)).toBe(false);
  });

  it("returns false for NaN", () => {
    expect(isValidPrice(NaN)).toBe(false);
  });

  it("returns false for Infinity", () => {
    expect(isValidPrice(Infinity)).toBe(false);
  });
});

describe("assetTypeLabel", () => {
  it("returns Chinese labels for known types", () => {
    expect(assetTypeLabel("CASH" as any)).toBe("现金");
    expect(assetTypeLabel("A_SHARE" as any)).toBe("A股");
    expect(assetTypeLabel("US_STOCK" as any)).toBe("美股");
    expect(assetTypeLabel("ETF" as any)).toBe("ETF");
    expect(assetTypeLabel("MUTUAL_FUND" as any)).toBe("场外基金");
    expect(assetTypeLabel("BANK_WEALTH" as any)).toBe("银行理财");
    expect(assetTypeLabel("GOLD_ACCUMULATION" as any)).toBe("黄金积存");
    expect(assetTypeLabel("BOND" as any)).toBe("债券");
    expect(assetTypeLabel("OTHER" as any)).toBe("其他");
  });

  it("returns type itself for unknown type", () => {
    expect(assetTypeLabel("CRYPTO" as any)).toBe("CRYPTO");
  });
});
