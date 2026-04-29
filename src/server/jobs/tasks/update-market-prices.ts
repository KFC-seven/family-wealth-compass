import type { JobDefinition, JobContext, JobResult } from "../types";
import type { DataSource } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { safeGetPrice } from "@/server/market-data/registry";
import { isValidPrice } from "@/server/market-data/normalize";
import { registerJob } from "../registry";

/**
 * 资产类型是否需要自动更新价格。
 * BANK_WEALTH 和 CASH 不强制自动更新，但可以被手动触发。
 */
function shouldAutoUpdate(type: string): boolean {
  return !["CASH", "BANK_WEALTH"].includes(type);
}

function toDataSource(source: string): DataSource {
  if (source === "manual") return "MANUAL";
  if (source === "mock") return "SEED";
  return "MARKET_API";
}

export const updateMarketPricesJob: JobDefinition = {
  name: "update-market-prices",
  displayName: "更新行情/净值",
  description: "查询需要更新价格的 Asset，拉取最新行情或净值，写入 PriceSnapshot",
  async execute(ctx: JobContext): Promise<JobResult> {
    const assets = await prisma.asset.findMany({
      where: { isActive: true },
      select: { id: true, code: true, symbol: true, type: true, market: true, currency: true },
    });

    // 过滤不需要自动更新的类型
    const updatable = assets.filter((a) => shouldAutoUpdate(a.type));

    if (updatable.length === 0) {
      return {
        status: "SKIPPED",
        successCount: 0,
        failureCount: 0,
        skippedCount: assets.length,
        metadata: { reason: "无可自动更新的资产", totalAssets: assets.length },
      };
    }

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = assets.length - updatable.length;

    for (const asset of updatable) {
      try {
        const result = await safeGetPrice({
          id: asset.id,
          code: asset.code ?? "unknown",
          symbol: asset.symbol,
          type: asset.type,
          market: asset.market,
          currency: asset.currency,
        });

        if (!isValidPrice(result.price)) {
          console.warn(`[update-market-prices] ${asset.code} 价格无效, 跳过`);
          skippedCount++;
          continue;
        }

        const priceDate = new Date(result.priceDate);

        // upsert: 同一 assetId + date 不重复
        await prisma.priceSnapshot.upsert({
          where: {
            assetId_date: {
              assetId: asset.id,
              date: priceDate,
            },
          },
          update: {
            price: result.price,
            currency: result.currency,
            source: toDataSource(result.source),
          },
          create: {
            assetId: asset.id,
            date: priceDate,
            price: result.price,
            currency: result.currency,
            source: toDataSource(result.source),
          },
        });

        // 更新 Holding 的 currentPrice / latestPriceDate
        await prisma.holding.updateMany({
          where: { assetId: asset.id, status: "CURRENT" },
          data: {
            currentPrice: result.price,
            latestPriceDate: priceDate,
          },
        });

        successCount++;
      } catch (err) {
        console.error(`[update-market-prices] 资产 ${asset.code} 更新失败:`, (err as Error).message);
        failureCount++;
      }
    }

    if (failureCount === updatable.length && updatable.length > 0) {
      return {
        status: "FAILED",
        successCount,
        failureCount,
        skippedCount,
        errorMessage: "全部资产更新失败",
        metadata: { total: updatable.length },
      };
    }

    if (failureCount > 0) {
      return {
        status: "PARTIAL",
        successCount,
        failureCount,
        skippedCount,
        metadata: { total: updatable.length },
      };
    }

    return { status: "SUCCESS", successCount, failureCount, skippedCount };
  },
};

registerJob(updateMarketPricesJob);
