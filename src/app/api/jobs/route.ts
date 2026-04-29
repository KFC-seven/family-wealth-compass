import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, handleApiError } from "@/server/api/response";

// 注册任务（确保 registry 已填充）
import "@/server/jobs/tasks/update-market-prices";
import "@/server/jobs/tasks/refresh-holding-snapshots";
import "@/server/jobs/tasks/generate-portfolio-snapshots";
import "@/server/jobs/tasks/run-daily-valuation";
import { getAllJobs } from "@/server/jobs/registry";

export async function GET() {
  try {
    const scheduledJobs = await prisma.scheduledJob.findMany({
      orderBy: { name: "asc" },
    });

    // 合并注册表中的任务定义
    const registered = getAllJobs();
    const data = scheduledJobs.map((sj) => {
      const def = registered.find((r) => r.name === sj.name);
      return {
        id: sj.id,
        name: sj.name,
        displayName: def?.displayName ?? sj.displayName,
        description: sj.description,
        cronExpression: sj.cronExpression,
        timezone: sj.timezone,
        isEnabled: sj.isEnabled,
        lastRunAt: sj.lastRunAt?.toISOString() ?? null,
        nextRunAt: sj.nextRunAt?.toISOString() ?? null,
        lastStatus: sj.lastStatus,
        config: sj.config,
        createdAt: sj.createdAt.toISOString(),
        updatedAt: sj.updatedAt.toISOString(),
      };
    });

    return createSuccessResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
