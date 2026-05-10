import { describe, it, expect } from "vitest";
import { normalizeAmount, normalizeAssetType, normalizePlatform, normalizeOcrRow } from "../normalize";
import type { OcrRowResult } from "../types";

describe("normalizeAmount", () => {
  it('strips ¥ symbol from "¥1,234.56"', () => {
    expect(normalizeAmount("¥1,234.56")).toBe("1234.56");
  });

  it('strips $ from "$500"', () => {
    expect(normalizeAmount("$500")).toBe("500");
  });

  it('trims whitespace from " 100.5 "', () => {
    expect(normalizeAmount(" 100.5 ")).toBe("100.5");
  });

  it('returns "" for non-numeric "abc"', () => {
    expect(normalizeAmount("abc")).toBe("");
  });

  it('returns "" for empty string', () => {
    expect(normalizeAmount("")).toBe("");
  });

  it('returns "" for undefined', () => {
    expect(normalizeAmount(undefined)).toBe("");
  });

  it('preserves negative sign "-50"', () => {
    expect(normalizeAmount("-50")).toBe("-50");
  });

  it('strips trailing % from "12.34%"', () => {
    expect(normalizeAmount("12.34%")).toBe("12.34");
  });

  it('returns "" for bare "-"', () => {
    expect(normalizeAmount("-")).toBe("");
  });

  it('returns "" for bare "."', () => {
    expect(normalizeAmount(".")).toBe("");
  });

  it('handles ￥ symbol (full-width)', () => {
    expect(normalizeAmount("￥999")).toBe("999");
  });

  it('passes through "12.34.56" (only char-level validation)', () => {
    // The normalizeAmount function only validates characters, not multiple dots
    expect(normalizeAmount("12.34.56")).toBe("12.34.56");
  });
});

describe("normalizeAssetType", () => {
  it('maps "A股" to "A_SHARE"', () => {
    expect(normalizeAssetType("A股")).toBe("A_SHARE");
  });

  it('maps "股票" to "A_SHARE"', () => {
    expect(normalizeAssetType("股票")).toBe("A_SHARE");
  });

  it('maps "a股" to "A_SHARE"', () => {
    expect(normalizeAssetType("a股")).toBe("A_SHARE");
  });

  it('maps "基金" to "MUTUAL_FUND"', () => {
    expect(normalizeAssetType("基金")).toBe("MUTUAL_FUND");
  });

  it('maps "公募基金" to "MUTUAL_FUND"', () => {
    expect(normalizeAssetType("公募基金")).toBe("MUTUAL_FUND");
  });

  it('maps "ETF" to "ETF"', () => {
    expect(normalizeAssetType("ETF")).toBe("ETF");
  });

  it('maps "etf" to "ETF"', () => {
    expect(normalizeAssetType("etf")).toBe("ETF");
  });

  it('maps "场内基金" to "ETF"', () => {
    expect(normalizeAssetType("场内基金")).toBe("ETF");
  });

  it('maps "黄金" to "GOLD_ACCUMULATION"', () => {
    expect(normalizeAssetType("黄金")).toBe("GOLD_ACCUMULATION");
  });

  it('maps "积存金" to "GOLD_ACCUMULATION"', () => {
    expect(normalizeAssetType("积存金")).toBe("GOLD_ACCUMULATION");
  });

  it('maps "美股" to "US_STOCK"', () => {
    expect(normalizeAssetType("美股")).toBe("US_STOCK");
  });

  it('maps "债券" to "BOND"', () => {
    expect(normalizeAssetType("债券")).toBe("BOND");
  });

  it('maps "银行理财" to "BANK_WEALTH"', () => {
    expect(normalizeAssetType("银行理财")).toBe("BANK_WEALTH");
  });

  it('maps "现金" to "CASH"', () => {
    expect(normalizeAssetType("现金")).toBe("CASH");
  });

  it('returns uppercase for unknown values', () => {
    expect(normalizeAssetType("unknown")).toBe("UNKNOWN");
  });

  it('returns "" for undefined', () => {
    expect(normalizeAssetType(undefined)).toBe("");
  });

  it('returns "" for empty string', () => {
    expect(normalizeAssetType("")).toBe("");
  });
});

describe("normalizePlatform", () => {
  it('maps "支付宝" to "ALIPAY"', () => {
    expect(normalizePlatform("支付宝")).toBe("ALIPAY");
  });

  it('maps "支付宝基金" to "ALIPAY"', () => {
    expect(normalizePlatform("支付宝基金")).toBe("ALIPAY");
  });

  it('maps "华泰证券" to "BROKER"', () => {
    expect(normalizePlatform("华泰证券")).toBe("BROKER");
  });

  it('maps "券商App" to "BROKER"', () => {
    expect(normalizePlatform("券商App")).toBe("BROKER");
  });

  it('maps "工商银行" to "BANK"', () => {
    expect(normalizePlatform("工商银行")).toBe("BANK");
  });

  it('maps "招商银行" to "BANK"', () => {
    expect(normalizePlatform("招商银行")).toBe("BANK");
  });

  it('maps "other" to "OTHER"', () => {
    expect(normalizePlatform("other")).toBe("OTHER");
  });

  it('maps "ALIPAY" directly', () => {
    expect(normalizePlatform("ALIPAY")).toBe("ALIPAY");
  });

  it('returns "" for undefined', () => {
    expect(normalizePlatform(undefined)).toBe("");
  });

  it('returns "" for empty string', () => {
    expect(normalizePlatform("")).toBe("");
  });
});

describe("normalizeOcrRow", () => {
  it("normalizes all amount fields and assetType", () => {
    const row: OcrRowResult = {
      member: "爸爸",
      account: "账户",
      assetName: "某基金",
      assetType: "基金",
      quantity: "5,000",
      price: "1.56",
      marketValue: "¥7,800",
      cost: "¥7,000",
      holdingReturn: "¥800",
      rawText: "某基金 | 5000份",
      confidence: 90,
    };
    const result = normalizeOcrRow(row);
    expect(result.quantity).toBe("5000");
    expect(result.price).toBe("1.56");
    expect(result.marketValue).toBe("7800");
    expect(result.cost).toBe("7000");
    expect(result.holdingReturn).toBe("800");
    expect(result.assetType).toBe("MUTUAL_FUND");
  });

  it("preserves other fields unchanged", () => {
    const row: OcrRowResult = {
      member: "爸爸",
      account: "账户",
      assetName: "某基金",
      assetType: "MUTUAL_FUND",
      rawText: "test",
      confidence: 92,
    };
    const result = normalizeOcrRow(row);
    expect(result.member).toBe("爸爸");
    expect(result.account).toBe("账户");
    expect(result.assetName).toBe("某基金");
    expect(result.rawText).toBe("test");
    expect(result.confidence).toBe(92);
  });

  it("falls back to original assetType when normalize returns empty", () => {
    const row: OcrRowResult = {
      member: "爸爸",
      account: "账户",
      assetName: "某资产",
      assetType: "",
      rawText: "test",
      confidence: 90,
    };
    const result = normalizeOcrRow(row);
    expect(result.assetType).toBe("");
  });
});
