import type { MarketDataProvider, MarketAsset, MarketPriceResult, MarketDataProviderHealth } from "../types";
import type { AssetTypeEnum } from "@/generated/prisma/client";

/** Mock 价格基准（2026-04-29 为参考日期） */
const MOCK_BASE_PRICES: Record<string, number> = {
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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 完全离线可用的 Mock 数据源。
 * 根据资产类型返回预设基准价格，加上小幅随机波动模拟真实行情。
 */
export class MockMarketDataProvider implements MarketDataProvider {
  name = "mock";
  supportedAssetTypes: AssetTypeEnum[] = [
    "CASH", "A_SHARE", "US_STOCK", "ETF", "MUTUAL_FUND",
    "BANK_WEALTH", "GOLD_ACCUMULATION", "BOND", "OTHER",
  ];

  constructor(private seed?: number) {}

  isEnabled(): boolean {
    return true;
  }

  async getLatestPrice(asset: MarketAsset): Promise<MarketPriceResult> {
    const base = MOCK_BASE_PRICES[asset.type] ?? 1;
    const jitter = 1 + (Math.random() - 0.5) * 0.02;
    return {
      assetId: asset.id,
      assetCode: asset.code,
      symbol: asset.symbol ?? undefined,
      assetType: asset.type,
      price: Math.round(base * jitter * 10000) / 10000,
      currency: asset.currency ?? "CNY",
      priceDate: todayStr(),
      source: "mock",
      confidence: 1,
    };
  }

  async healthCheck(): Promise<MarketDataProviderHealth> {
    return { status: "HEALTHY", message: "Mock 始终可用", checkedAt: new Date().toISOString() };
  }
}
