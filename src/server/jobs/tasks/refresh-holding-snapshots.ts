import type { JobDefinition, JobContext, JobResult } from "../types";
import { prisma } from "@/server/db/prisma";
import { decimalToNumber } from "@/server/finance/mappers";
import { registerJob } from "../registry";

/**
 * 刷新所有持仓的估值字段。
 * 对 CURRENT 持仓用最新价格更新市值和持仓收益。
 * 对 CLEARED 持仓仅保留历史值。
 */
export const refreshHoldingSnapshotsJob: JobDefinition = {
  name: "refresh-holding-snapshots",
  displayName: "刷新持仓快照",
  description: "根据最新价格/净值刷新 quantity, averageCost, currentMarketValue, holdingReturn 等字段",
  async execute(_ctx: JobContext): Promise<JobResult> {
    const holdings = await prisma.holding.findMany({
      where: { status: "CURRENT" },
      select: {
        id: true,
        quantity: true,
        averageCost: true,
        remainingCost: true,
        currentPrice: true,
        currentMarketValue: true,
        holdingReturn: true,
        realizedReturn: true,
        cumulativeReturn: true,
      },
    });

    if (holdings.length === 0) {
      return {
        status: "SKIPPED",
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        metadata: { reason: "无 CURRENT 持仓需要刷新" },
      };
    }

    let successCount = 0;
    let failureCount = 0;

    for (const h of holdings) {
      try {
        const qty = decimalToNumber(h.quantity);
        const price = decimalToNumber(h.currentPrice);
        const remainingCost = decimalToNumber(h.remainingCost);
        const realized = decimalToNumber(h.realizedReturn);

        // Only recalculate if holding has valid quantity (fund imports may not have qty)
        if (qty > 0 && price > 0) {
          const marketValue = qty * price;
          const holdingReturn = marketValue - remainingCost;
          await prisma.holding.update({
            where: { id: h.id },
            data: {
              currentMarketValue: marketValue,
              holdingReturn,
              cumulativeReturn: holdingReturn + realized,
            },
          });
        } else {
          // Price-only update: keep existing marketValue, recalc return if possible
          const existingMv = decimalToNumber(h.currentMarketValue);
          const data: Record<string, number> = {};
          if (price > 0) data.currentPrice = price;
          if (existingMv > 0) {
            data.holdingReturn = existingMv - remainingCost;
            data.cumulativeReturn = data.holdingReturn + realized;
          }
          if (Object.keys(data).length > 0) {
            await prisma.holding.update({ where: { id: h.id }, data: data as any });
          }
        }

        successCount++;
      } catch (err) {
        console.error(`[refresh-holding-snapshots] 持仓 ${h.id} 刷新失败:`, (err as Error).message);
        failureCount++;
      }
    }

    if (failureCount === holdings.length && holdings.length > 0) {
      return {
        status: "FAILED",
        successCount: 0,
        failureCount,
        skippedCount: 0,
        errorMessage: "全部持仓刷新失败",
      };
    }

    if (failureCount > 0) {
      return {
        status: "PARTIAL",
        successCount,
        failureCount,
        skippedCount: 0,
      };
    }

    return { status: "SUCCESS", successCount, failureCount, skippedCount: 0 };
  },
};

registerJob(refreshHoldingSnapshotsJob);
