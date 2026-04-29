import type { AssetTypeEnum } from "@/generated/prisma/client";
import type { MarketPriceResult } from "./types";

/**
 * 价格结果按 date 去重，保留最新一条。
 * 如果价格 <= 0，视为无效结果丢弃。
 */
export function deduplicateResults(
  results: MarketPriceResult[],
): MarketPriceResult[] {
  const seen = new Map<string, MarketPriceResult>();
  for (const r of results) {
    if (r.price <= 0) continue;
    const key = `${r.assetId}:${r.priceDate}`;
    const existing = seen.get(key);
    if (!existing || r.priceDate > existing.priceDate) {
      seen.set(key, r);
    }
  }
  return Array.from(seen.values());
}

/**
 * 标准币种转换规则。目前仅做单位识别，不做实际汇率换算。
 */
export function normalizeCurrency(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const upper = raw.toUpperCase().trim();
  const map: Record<string, string> = {
    CNY: "CNY",
    RMB: "CNY",
    USD: "USD",
    HKD: "HKD",
    EUR: "EUR",
    JPY: "JPY",
  };
  return map[upper] ?? fallback;
}

/**
 * 基金净值有时返回 0.0000，在实际写入前过滤。
 */
export function isValidPrice(price: number): boolean {
  return Number.isFinite(price) && price > 0;
}

/**
 * 匹配资产类型显示名
 */
export function assetTypeLabel(type: AssetTypeEnum): string {
  const map: Record<string, string> = {
    CASH: "现金",
    A_SHARE: "A股",
    US_STOCK: "美股",
    ETF: "ETF",
    MUTUAL_FUND: "场外基金",
    BANK_WEALTH: "银行理财",
    GOLD_ACCUMULATION: "黄金积存",
    BOND: "债券",
    OTHER: "其他",
  };
  return map[type] ?? type;
}
