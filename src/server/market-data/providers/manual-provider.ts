import type { MarketDataProvider, MarketAsset, MarketPriceResult, MarketDataProviderHealth } from "../types";
import type { AssetTypeEnum } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { decimalToNumber } from "@/server/finance/mappers";

/**
 * 使用数据库中已有的 PriceSnapshot 或手动维护价格。
 * 适用于银行理财、黄金积存金等无法自动获取的资产。
 * 如果当天已有 MANUAL 来源的价格，优先返回。
 */
export class ManualPriceProvider implements MarketDataProvider {
  name = "manual";
  supportedAssetTypes: AssetTypeEnum[] = [
    "CASH", "A_SHARE", "US_STOCK", "ETF", "MUTUAL_FUND",
    "BANK_WEALTH", "GOLD_ACCUMULATION", "BOND", "OTHER",
  ];

  isEnabled(): boolean {
    return true;
  }

  async getLatestPrice(asset: MarketAsset): Promise<MarketPriceResult> {
    const today = new Date().toISOString().slice(0, 10);
    const todayDate = new Date(today);

    // 优先查询今天的 MANUAL 价格
    const manual = await prisma.priceSnapshot.findFirst({
      where: {
        assetId: asset.id,
        date: {
          gte: todayDate,
          lt: new Date(today + "T23:59:59.999Z"),
        },
        source: "MANUAL",
      },
      orderBy: { date: "desc" },
    });

    if (manual) {
      return this.toResult(asset, decimalToNumber(manual.price), manual.currency, today, "manual");
    }

    // Fallback：查最近价格
    const latest = await prisma.priceSnapshot.findFirst({
      where: { assetId: asset.id },
      orderBy: { date: "desc" },
    });

    if (latest) {
      return this.toResult(
        asset,
        decimalToNumber(latest.price),
        latest.currency,
        latest.date.toISOString().slice(0, 10),
        "manual",
      );
    }

    // 无任何价格记录
    return this.toResult(asset, asset.type === "CASH" ? 1 : 0, asset.currency ?? "CNY", today, "manual");
  }

  async healthCheck(): Promise<MarketDataProviderHealth> {
    return { status: "HEALTHY", message: "Manual 始终可用", checkedAt: new Date().toISOString() };
  }

  private toResult(
    asset: MarketAsset,
    price: number,
    currency: string,
    date: string,
    source: string,
  ): MarketPriceResult {
    return {
      assetId: asset.id,
      assetCode: asset.code,
      symbol: asset.symbol ?? undefined,
      assetType: asset.type,
      price,
      currency,
      priceDate: date,
      source,
      confidence: 1,
    };
  }
}
