import type { JobTrigger, JobStatus } from "@/generated/prisma/client";
import type { JobContext, JobResult } from "./types";
import { getJob } from "./registry";
import { createJobRun, completeJobRun } from "./logger";
import { prisma } from "@/server/db/prisma";

/**
 * 执行单个任务，全程记录 JobRun。
 */
export async function runJob(
  jobName: string,
  trigger: JobTrigger = "MANUAL",
  date?: string,
): Promise<JobResult> {
  const job = getJob(jobName);
  if (!job) {
    console.error(`[JobRunner] 未知任务: ${jobName}`);
    return {
      status: "FAILED",
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      errorMessage: `未知任务: ${jobName}`,
    };
  }

  // 查询 ScheduledJob 的数据库 id
  const scheduled = await prisma.scheduledJob.findUnique({
    where: { name: jobName },
  });

  const jobRunId = await createJobRun(jobName, trigger, scheduled?.id ?? undefined);
  const ctx: JobContext = { jobName, trigger, date, jobRunId };

  console.log(`[JobRunner] 开始执行: ${jobName} (trigger=${trigger}, date=${date ?? "today"})`);

  let result: JobResult;
  try {
    result = await job.execute(ctx);
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[JobRunner] ${jobName} 异常:`, msg);
    result = {
      status: "FAILED",
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      errorMessage: msg,
      errorDetails: String(err),
    };
  }

  await completeJobRun(
    jobRunId,
    jobName,
    result.status,
    result.successCount,
    result.failureCount,
    result.skippedCount,
    result.errorMessage,
    result.errorDetails,
    result.metadata,
  );

  console.log(
    `[JobRunner] 完成: ${jobName} status=${result.status} ` +
    `success=${result.successCount} fail=${result.failureCount} skip=${result.skippedCount}`,
  );

  return result;
}

/**
 * 串行执行任务列表，如果上一步部分失败，继续执行下一步。
 */
export async function runJobSequence(
  jobNames: string[],
  trigger: JobTrigger = "SCHEDULER",
  date?: string,
): Promise<JobResult[]> {
  const results: JobResult[] = [];
  for (const name of jobNames) {
    const r = await runJob(name, trigger, date);
    results.push(r);
  }
  return results;
}
