import type { MarketDataProvider, MarketAsset, MarketPriceResult, MarketDataProviderHealth } from "../types";
import type { AssetTypeEnum } from "@/generated/prisma/client";
import { ProviderUnavailableError } from "../errors";

/**
 * Tushare 数据源骨架。
 *
 * 本阶段不要求完整接入，仅实现配置检测和 healthCheck。
 * 需要 TUSHARE_TOKEN 环境变量。
 * 后续可用于 A 股、ETF、基金、指数等数据。
 *
 * Tushare Pro: https://tushare.pro
 */
export class TushareProvider implements MarketDataProvider {
  name = "tushare";
  supportedAssetTypes: AssetTypeEnum[] = [
    "A_SHARE", "ETF", "MUTUAL_FUND",
  ];

  private enabled: boolean;
  private token: string;

  constructor() {
    this.token = process.env.TUSHARE_TOKEN ?? "";
    this.enabled =
      process.env.MARKET_DATA_ENABLE_TUSHARE === "true" &&
      this.token.length > 0;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async getLatestPrice(_asset: MarketAsset): Promise<MarketPriceResult> {
    throw new ProviderUnavailableError(this.name, "Tushare provider 本阶段未实现完整接入");
  }

  async healthCheck(): Promise<MarketDataProviderHealth> {
    if (!process.env.MARKET_DATA_ENABLE_TUSHARE || process.env.MARKET_DATA_ENABLE_TUSHARE !== "true") {
      return {
        status: "DISABLED",
        message: "MARKET_DATA_ENABLE_TUSHARE 未开启",
        checkedAt: new Date().toISOString(),
      };
    }

    if (!this.token) {
      return {
        status: "DISABLED",
        message: "TUSHARE_TOKEN 未配置",
        checkedAt: new Date().toISOString(),
      };
    }

    // TODO: 后续实现真实 healthCheck 通过 Tushare API
    return {
      status: "DEGRADED",
      message: "Tushare token 已配置但本阶段仅骨架",
      checkedAt: new Date().toISOString(),
    };
  }
}
