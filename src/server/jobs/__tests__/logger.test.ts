import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    jobRun: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    scheduledJob: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));

import { createJobRun, completeJobRun, getRecentRuns } from "../logger";
import type { JobStatus } from "@/generated/prisma/client";

const fakeRunId = "run-logger-001";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createJobRun", () => {
  it("creates a JobRun with correct fields", async () => {
    mockPrisma.jobRun.create.mockResolvedValue({ id: fakeRunId });
    mockPrisma.scheduledJob.updateMany.mockResolvedValue({ count: 1 });

    const runId = await createJobRun("test-job", "SCHEDULER", "sched-001");

    expect(runId).toBe(fakeRunId);
    expect(mockPrisma.jobRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobId: "sched-001",
        jobName: "test-job",
        status: "RUNNING",
        triggeredBy: "SCHEDULER",
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
      }),
    });
    expect(mockPrisma.jobRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("updates ScheduledJob status to RUNNING", async () => {
    mockPrisma.jobRun.create.mockResolvedValue({ id: fakeRunId });
    mockPrisma.scheduledJob.updateMany.mockResolvedValue({ count: 1 });

    await createJobRun("test-job", "MANUAL");

    expect(mockPrisma.scheduledJob.updateMany).toHaveBeenCalledWith({
      where: { name: "test-job" },
      data: { lastStatus: "RUNNING", lastRunAt: expect.any(Date) },
    });
  });

  it("works without jobId (unknown ScheduledJob)", async () => {
    mockPrisma.jobRun.create.mockResolvedValue({ id: fakeRunId });
    mockPrisma.scheduledJob.updateMany.mockResolvedValue({ count: 0 });

    const runId = await createJobRun("orphan-job", "MANUAL");
    expect(runId).toBe(fakeRunId);
    expect(mockPrisma.jobRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ jobId: undefined }),
      }),
    );
  });
});

describe("completeJobRun", () => {
  const startedAt = new Date("2026-05-11T00:00:00.000Z");
  const finishedAt = new Date("2026-05-11T00:01:30.000Z"); // 90s later

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(finishedAt);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates durationMs from start to finish", async () => {
    mockPrisma.jobRun.findUnique.mockResolvedValue({
      id: fakeRunId,
      startedAt,
    });
    mockPrisma.jobRun.update.mockResolvedValue({ id: fakeRunId });
    mockPrisma.scheduledJob.updateMany.mockResolvedValue({ count: 1 });

    await completeJobRun(fakeRunId, "test-job", "SUCCESS", 5, 0, 0);

    expect(mockPrisma.jobRun.update).toHaveBeenCalledWith({
      where: { id: fakeRunId },
      data: expect.objectContaining({
        status: "SUCCESS",
        finishedAt,
        durationMs: 90000,
        successCount: 5,
        failureCount: 0,
        skippedCount: 0,
      }),
    });
  });

  it("handles missing jobRun (no durationMs)", async () => {
    mockPrisma.jobRun.findUnique.mockResolvedValue(null);
    mockPrisma.jobRun.update.mockResolvedValue({ id: fakeRunId });
    mockPrisma.scheduledJob.updateMany.mockResolvedValue({ count: 1 });

    await completeJobRun(fakeRunId, "test-job", "FAILED", 0, 1, 0);

    expect(mockPrisma.jobRun.update).toHaveBeenCalledWith({
      where: { id: fakeRunId },
      data: expect.objectContaining({
        status: "FAILED",
        durationMs: undefined,
      }),
    });
  });

  it("truncates errorMessage to 2000 chars", async () => {
    mockPrisma.jobRun.findUnique.mockResolvedValue({ id: fakeRunId, startedAt });
    mockPrisma.jobRun.update.mockResolvedValue({ id: fakeRunId });
    mockPrisma.scheduledJob.updateMany.mockResolvedValue({ count: 1 });

    const longError = "x".repeat(3000);
    await completeJobRun(fakeRunId, "test-job", "FAILED", 0, 1, 0, longError);

    expect(mockPrisma.jobRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          errorMessage: "x".repeat(2000),
        }),
      }),
    );
  });

  it("stores errorDetails as JSON", async () => {
    mockPrisma.jobRun.findUnique.mockResolvedValue({ id: fakeRunId, startedAt });
    mockPrisma.jobRun.update.mockResolvedValue({ id: fakeRunId });
    mockPrisma.scheduledJob.updateMany.mockResolvedValue({ count: 1 });

    const details = { cause: "timeout", code: 503 };
    await completeJobRun(fakeRunId, "test-job", "FAILED", 0, 1, 0, "error", details);

    expect(mockPrisma.jobRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          errorDetails: details,
        }),
      }),
    );
  });

  it("updates ScheduledJob status on completion", async () => {
    mockPrisma.jobRun.findUnique.mockResolvedValue({ id: fakeRunId, startedAt });
    mockPrisma.jobRun.update.mockResolvedValue({ id: fakeRunId });
    mockPrisma.scheduledJob.updateMany.mockResolvedValue({ count: 1 });

    await completeJobRun(fakeRunId, "test-job", "SUCCESS", 3, 0, 0);

    expect(mockPrisma.scheduledJob.updateMany).toHaveBeenCalledWith({
      where: { name: "test-job" },
      data: { lastStatus: "SUCCESS" },
    });
  });
});

describe("getRecentRuns", () => {
  it("returns runs with default limit of 20", async () => {
    mockPrisma.jobRun.findMany.mockResolvedValue([
      { id: "run-1", jobName: "job-a" },
      { id: "run-2", jobName: "job-b" },
    ]);

    const runs = await getRecentRuns();

    expect(runs).toHaveLength(2);
    expect(mockPrisma.jobRun.findMany).toHaveBeenCalledWith({
      orderBy: { startedAt: "desc" },
      take: 20,
    });
  });

  it("respects custom limit", async () => {
    mockPrisma.jobRun.findMany.mockResolvedValue([]);

    await getRecentRuns(5);

    expect(mockPrisma.jobRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });
});
