import type { AssetTypeEnum } from "@/generated/prisma/client";

/** 核心行情数据提供者接口 */
export interface MarketDataProvider {
  name: string;
  supportedAssetTypes: AssetTypeEnum[];
  isEnabled(): boolean | Promise<boolean>;
  getLatestPrice(asset: MarketAsset): Promise<MarketPriceResult>;
  getHistoricalPrices?(
    asset: MarketAsset,
    startDate: string,
    endDate: string,
  ): Promise<MarketPriceResult[]>;
  healthCheck?(): Promise<MarketDataProviderHealth>;
}

/** 传递给 provider 的标的标识 */
export interface MarketAsset {
  id: string;
  code: string;
  symbol?: string | null;
  type: AssetTypeEnum;
  market?: string | null;
  currency?: string;
}

/** 单次行情查询结果 */
export interface MarketPriceResult {
  assetId: string;
  assetCode: string;
  symbol?: string;
  assetType: AssetTypeEnum;
  price: number;
  currency: string;
  priceDate: string;
  source: string;
  raw?: unknown;
  confidence?: number;
  warning?: string;
}

/** Provider 健康检查 */
export interface MarketDataProviderHealth {
  status: "HEALTHY" | "DEGRADED" | "FAILED" | "DISABLED";
  message?: string;
  checkedAt: string;
  latencyMs?: number;
}

/** 数据源匹配上下文 */
export interface DataSourceResolution {
  provider: MarketDataProvider;
  sourceName: string;
  fallback: boolean;
}

/** Provider 构造函数选项 */
export interface MarketDataProviderOptions {
  enabled?: boolean;
  config?: Record<string, string>;
}
