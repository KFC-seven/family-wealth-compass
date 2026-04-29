import type { JobStatus, JobTrigger } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

/** 创建一条 JobRun 并返回其 id */
export async function createJobRun(
  jobName: string,
  trigger: JobTrigger,
  jobId?: string,
): Promise<string> {
  const run = await prisma.jobRun.create({
    data: {
      jobId,
      jobName,
      status: "RUNNING",
      startedAt: new Date(),
      triggeredBy: trigger,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
    },
  });

  // 同步更新 ScheduledJob 状态
  await prisma.scheduledJob.updateMany({
    where: { name: jobName },
    data: { lastStatus: "RUNNING", lastRunAt: new Date() },
  });

  return run.id;
}

/** 完成 JobRun */
export async function completeJobRun(
  jobRunId: string,
  jobName: string,
  status: JobStatus,
  successCount: number,
  failureCount: number,
  skippedCount: number,
  errorMessage?: string,
  errorDetails?: unknown,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const finishedAt = new Date();
  const run = await prisma.jobRun.findUnique({ where: { id: jobRunId } });
  const durationMs = run
    ? finishedAt.getTime() - run.startedAt.getTime()
    : undefined;

  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: {
      status,
      finishedAt,
      durationMs,
      successCount,
      failureCount,
      skippedCount,
      errorMessage: errorMessage?.slice(0, 2000) ?? null,
      errorDetails: errorDetails ? (JSON.parse(JSON.stringify(errorDetails)) as any) : null,
      metadata: metadata ? (JSON.parse(JSON.stringify(metadata)) as any) : null,
    },
  });

  // 同步更新 ScheduledJob 状态
  await prisma.scheduledJob.updateMany({
    where: { name: jobName },
    data: { lastStatus: status },
  });
}

/** 获取最近运行记录 */
export async function getRecentRuns(limit = 20) {
  return prisma.jobRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}
