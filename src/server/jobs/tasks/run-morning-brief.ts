import { registerJob } from "../registry";
import type { JobDefinition, JobContext, JobResult } from "../types";
import { runJobSequence } from "../runner";

export const runMorningBriefJob: JobDefinition = {
  name: "run-morning-brief",
  displayName: "每日晨报",
  description: "串行执行: 生成简报 → 推送简报",
  async execute(ctx: JobContext): Promise<JobResult> {
    const results = await runJobSequence(
      ["generate-daily-brief", "push-daily-brief"],
      ctx.trigger,
      ctx.date,
    );

    const allFailed = results.every((r) => r.status === "FAILED");
    const successCount = results.reduce((s, r) => s + r.successCount, 0);
    const failureCount = results.reduce((s, r) => s + r.failureCount, 0);

    if (allFailed) {
      return { status: "FAILED", successCount, failureCount, skippedCount: 0, errorMessage: "晨报生成和推送均失败" };
    }

    if (results.some((r) => r.status === "FAILED")) {
      return { status: "PARTIAL", successCount, failureCount, skippedCount: 0, metadata: { steps: results.map((r) => ({ status: r.status })) } };
    }

    return { status: "SUCCESS", successCount, failureCount, skippedCount: 0 };
  },
};

registerJob(runMorningBriefJob);
