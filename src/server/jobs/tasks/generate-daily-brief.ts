import { registerJob } from "../registry";
import type { JobDefinition, JobContext, JobResult } from "../types";
import { generateDailyBrief } from "@/server/brief/brief-generator";

export const generateDailyBriefJob: JobDefinition = {
  name: "generate-daily-brief",
  displayName: "生成每日简报",
  description: "使用 AI/Mock 生成 DailyBrief，写入数据库",
  async execute(ctx: JobContext): Promise<JobResult> {
    try {
      const date = ctx.date ?? new Date().toISOString().slice(0, 10);
      const brief = await generateDailyBrief({ date, force: true });

      return {
        status: brief.status === "GENERATED" ? "SUCCESS" : "SKIPPED",
        successCount: 1,
        failureCount: 0,
        skippedCount: 0,
        metadata: { briefId: brief.id, date },
      };
    } catch (err) {
      return {
        status: "FAILED",
        successCount: 0,
        failureCount: 1,
        skippedCount: 0,
        errorMessage: (err as Error).message,
      };
    }
  },
};

registerJob(generateDailyBriefJob);
