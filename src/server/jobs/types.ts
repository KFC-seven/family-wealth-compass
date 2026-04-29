import type { JobStatus, JobTrigger } from "@/generated/prisma/client";

/** 任务运行上下文 */
export interface JobContext {
  jobName: string;
  trigger: JobTrigger;
  date?: string;
  jobRunId: string;
}

/** 任务执行结果汇总 */
export interface JobResult {
  status: JobStatus;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errorMessage?: string;
  errorDetails?: unknown;
  metadata?: Record<string, unknown>;
}

/** 任务定义 */
export interface JobDefinition {
  name: string;
  displayName: string;
  description?: string;
  execute(ctx: JobContext): Promise<JobResult>;
}

/** 简单的文件锁接口 */
export interface JobLock {
  acquire(jobName: string): Promise<boolean>;
  release(jobName: string): Promise<void>;
  isLocked(jobName: string): Promise<boolean>;
}
