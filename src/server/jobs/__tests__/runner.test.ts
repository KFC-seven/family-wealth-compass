import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JobDefinition, JobResult } from "../types";

// --- hoisted mocks ---

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    scheduledJob: { findUnique: vi.fn() },
  },
}));

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    createJobRun: vi.fn<() => Promise<string>>(),
    completeJobRun: vi.fn<() => Promise<void>>(),
  },
}));

const { mockRegistry } = vi.hoisted(() => ({
  mockRegistry: {
    getJob: vi.fn<(name: string) => JobDefinition | undefined>(),
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/server/jobs/logger", () => mockLogger);
vi.mock("@/server/jobs/registry", () => mockRegistry);

// --- import after mocks ---

import { runJob, runJobSequence } from "../runner";

// --- helpers ---

function makeJob(name: string, result: JobResult): JobDefinition {
  return {
    name,
    displayName: name,
    execute: vi.fn().mockResolvedValue(result),
  };
}

function makeThrowingJob(name: string): JobDefinition {
  return {
    name,
    displayName: name,
    execute: vi.fn().mockRejectedValue(new Error(`err from ${name}`)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.scheduledJob.findUnique.mockResolvedValue({ id: "sched-001", name: "test-job" });
  mockLogger.createJobRun.mockResolvedValue("run-001");
  mockLogger.completeJobRun.mockResolvedValue(undefined);
});

describe("runJob", () => {
  it("returns FAILED for unknown job name", async () => {
    mockRegistry.getJob.mockReturnValue(undefined);

    const result = await runJob("unknown-job");

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("unknown-job");
    // Should NOT call createJobRun or completeJobRun for unknown jobs
    expect(mockLogger.createJobRun).not.toHaveBeenCalled();
    expect(mockLogger.completeJobRun).not.toHaveBeenCalled();
    expect(mockPrisma.scheduledJob.findUnique).not.toHaveBeenCalled();
  });

  it("executes a valid job and returns its result", async () => {
    const successResult: JobResult = { status: "SUCCESS", successCount: 3, failureCount: 0, skippedCount: 1 };
    const job = makeJob("good-job", successResult);
    mockRegistry.getJob.mockReturnValue(job);

    const result = await runJob("good-job", "SCHEDULER", "2026-05-11");

    expect(result).toEqual(successResult);
    expect(job.execute).toHaveBeenCalledTimes(1);
    expect(job.execute).toHaveBeenCalledWith(
      expect.objectContaining({ jobName: "good-job", trigger: "SCHEDULER", date: "2026-05-11", jobRunId: "run-001" }),
    );
  });

  it("catches error from job.execute and returns FAILED", async () => {
    const job = makeThrowingJob("bad-job");
    mockRegistry.getJob.mockReturnValue(job);

    const result = await runJob("bad-job");

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("err from bad-job");
  });

  it("creates JobRun via createJobRun", async () => {
    const result: JobResult = { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 };
    const job = makeJob("tracked-job", result);
    mockRegistry.getJob.mockReturnValue(job);

    await runJob("tracked-job", "MANUAL");

    expect(mockLogger.createJobRun).toHaveBeenCalledWith("tracked-job", "MANUAL", "sched-001");
  });

  it("completes JobRun via completeJobRun with correct counts", async () => {
    const result: JobResult = { status: "SUCCESS", successCount: 2, failureCount: 1, skippedCount: 0 };
    const job = makeJob("completable-job", result);
    mockRegistry.getJob.mockReturnValue(job);

    await runJob("completable-job");

    expect(mockLogger.completeJobRun).toHaveBeenCalledWith(
      "run-001",
      "completable-job",
      "SUCCESS",
      2,
      1,
      0,
      undefined,
      undefined,
      undefined,
    );
  });

  it("handles ScheduledJob not found gracefully", async () => {
    mockPrisma.scheduledJob.findUnique.mockResolvedValue(null);
    const result: JobResult = { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 };
    const job = makeJob("orphan-job", result);
    mockRegistry.getJob.mockReturnValue(job);

    await runJob("orphan-job");

    expect(mockLogger.createJobRun).toHaveBeenCalledWith("orphan-job", "MANUAL", undefined);
  });
});

describe("runJobSequence", () => {
  it("runs a single job and returns one result", async () => {
    const result: JobResult = { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 };
    const job = makeJob("single-job", result);
    mockRegistry.getJob.mockReturnValue(job);

    const results = await runJobSequence(["single-job"]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("SUCCESS");
  });

  it("runs multiple jobs and returns all results", async () => {
    const jobA = makeJob("job-a", { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 });
    const jobB = makeJob("job-b", { status: "SUCCESS", successCount: 2, failureCount: 0, skippedCount: 0 });
    mockRegistry.getJob.mockImplementation((name: string) => {
      if (name === "job-a") return jobA;
      if (name === "job-b") return jobB;
      return undefined;
    });

    const results = await runJobSequence(["job-a", "job-b"]);

    expect(results).toHaveLength(2);
    expect(results[0].successCount).toBe(1);
    expect(results[1].successCount).toBe(2);
  });

  it("continues to next job even if previous fails", async () => {
    const failJob = makeThrowingJob("fail-job");
    const successJob = makeJob("success-job", { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 });
    mockRegistry.getJob.mockImplementation((name: string) => {
      if (name === "fail-job") return failJob;
      if (name === "success-job") return successJob;
      return undefined;
    });

    const results = await runJobSequence(["fail-job", "success-job"]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("FAILED");
    expect(results[1].status).toBe("SUCCESS");
  });

  it("passes trigger and date to each job", async () => {
    const job = makeJob("param-job", { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 });
    mockRegistry.getJob.mockReturnValue(job);

    await runJobSequence(["param-job"], "SCHEDULER", "2026-05-11");

    expect(job.execute).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: "SCHEDULER", date: "2026-05-11" }),
    );
  });
});
