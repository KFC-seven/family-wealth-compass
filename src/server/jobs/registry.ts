import type { JobDefinition } from "./types";

const jobMap = new Map<string, JobDefinition>();

export function registerJob(job: JobDefinition): void {
  if (jobMap.has(job.name)) {
    console.warn(`[JobRegistry] 任务 "${job.name}" 重复注册，覆盖旧定义`);
  }
  jobMap.set(job.name, job);
}

export function getJob(name: string): JobDefinition | undefined {
  return jobMap.get(name);
}

export function getAllJobs(): JobDefinition[] {
  return Array.from(jobMap.values());
}

export function getJobNames(): string[] {
  return Array.from(jobMap.keys());
}
