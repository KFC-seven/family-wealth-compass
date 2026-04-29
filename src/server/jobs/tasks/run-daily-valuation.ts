import type { JobDefinition, JobContext, JobResult } from "../types";
import { runJobSequence } from "../runner";
import { registerJob } from "../registry";

/**
 * 每日估值总任务：串行执行
 * 1. update-market-prices
 * 2. refresh-holding-snapshots
 * 3. generate-portfolio-snapshots
 */
export const runDailyValuationJob: JobDefinition = {
  name: "run-daily-valuation",
  displayName: "每日估值",
  description: "串行执行: 行情更新 → 持仓刷新 → 组合快照生成",
  async execute(ctx: JobContext): Promise<JobResult> {
    const results = await runJobSequence(
      ["update-market-prices", "refresh-holding-snapshots", "generate-portfolio-snapshots"],
      ctx.trigger,
      ctx.date,
    );

    const allSuccess = results.every((r) => r.status === "SUCCESS" || r.status === "SKIPPED");
    const allFailed = results.every((r) => r.status === "FAILED");

    const successCount = results.reduce((s, r) => s + r.successCount, 0);
    const failureCount = results.reduce((s, r) => s + r.failureCount, 0);
    const skippedCount = results.reduce((s, r) => s + r.skippedCount, 0);
    const errorMessages = results.filter((r) => r.errorMessage).map((r) => r.errorMessage);

    const metadata: Record<string, unknown> = {
      steps: results.map((r) => ({
        jobName: r.status,
        status: r.status,
        success: r.successCount,
        fail: r.failureCount,
      })),
    };

    if (allFailed) {
      return {
        status: "FAILED",
        successCount,
        failureCount,
        skippedCount,
        errorMessage: `每日估值全部失败: ${errorMessages.join("; ")}`,
        metadata,
      };
    }

    if (!allSuccess) {
      return {
        status: "PARTIAL",
        successCount,
        failureCount,
        skippedCount,
        metadata,
      };
    }

    return {
      status: "SUCCESS",
      successCount,
      failureCount,
      skippedCount,
    };
  },
};

registerJob(runDailyValuationJob);
