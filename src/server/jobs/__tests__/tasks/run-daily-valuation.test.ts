import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JobResult } from "../../types";

const { mockRunJobSequence } = vi.hoisted(() => ({
  mockRunJobSequence: vi.fn<() => Promise<JobResult[]>>(),
}));

vi.mock("@/server/jobs/runner", () => ({ runJobSequence: mockRunJobSequence }));

import { runDailyValuationJob } from "../../tasks/run-daily-valuation";
import type { JobContext } from "../../types";

function makeCtx(overrides: Partial<JobContext> = {}): JobContext {
  return { jobName: "run-daily-valuation", trigger: "SCHEDULER", jobRunId: "run-001", ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runDailyValuationJob", () => {
  it("returns SUCCESS when all sub-tasks succeed", async () => {
    mockRunJobSequence.mockResolvedValue([
      { status: "SUCCESS", successCount: 2, failureCount: 0, skippedCount: 0 },
      { status: "SUCCESS", successCount: 3, failureCount: 0, skippedCount: 0 },
      { status: "SUCCESS", successCount: 3, failureCount: 0, skippedCount: 0 },
    ]);

    const result = await runDailyValuationJob.execute(makeCtx());

    expect(result.status).toBe("SUCCESS");
    expect(result.successCount).toBe(8);
    expect(result.failureCount).toBe(0);
  });

  it("considers SKIPPED as success (allSuccess check)", async () => {
    mockRunJobSequence.mockResolvedValue([
      { status: "SKIPPED", successCount: 0, failureCount: 0, skippedCount: 5 },
      { status: "SUCCESS", successCount: 3, failureCount: 0, skippedCount: 0 },
      { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 },
    ]);

    const result = await runDailyValuationJob.execute(makeCtx());

    expect(result.status).toBe("SUCCESS");
  });

  it("returns FAILED when all sub-tasks fail", async () => {
    mockRunJobSequence.mockResolvedValue([
      { status: "FAILED", successCount: 0, failureCount: 1, skippedCount: 0, errorMessage: "err1" },
      { status: "FAILED", successCount: 0, failureCount: 2, skippedCount: 0, errorMessage: "err2" },
      { status: "FAILED", successCount: 0, failureCount: 3, skippedCount: 0, errorMessage: "err3" },
    ]);

    const result = await runDailyValuationJob.execute(makeCtx());

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("每日估值全部失败");
    expect(result.failureCount).toBe(6);
  });

  it("returns PARTIAL with mixed results", async () => {
    mockRunJobSequence.mockResolvedValue([
      { status: "SUCCESS", successCount: 2, failureCount: 0, skippedCount: 0 },
      { status: "FAILED", successCount: 0, failureCount: 1, skippedCount: 0, errorMessage: "snapshot error" },
      { status: "SUCCESS", successCount: 3, failureCount: 0, skippedCount: 0 },
    ]);

    const result = await runDailyValuationJob.execute(makeCtx());

    expect(result.status).toBe("PARTIAL");
    expect(result.successCount).toBe(5);
    expect(result.failureCount).toBe(1);
  });

  it("passes trigger and date to runJobSequence", async () => {
    mockRunJobSequence.mockResolvedValue([
      { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 },
      { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 },
      { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 },
    ]);

    await runDailyValuationJob.execute(makeCtx({ trigger: "MANUAL", date: "2026-05-11" }));

    expect(mockRunJobSequence).toHaveBeenCalledWith(
      ["update-market-prices", "refresh-holding-snapshots", "generate-portfolio-snapshots"],
      "MANUAL",
      "2026-05-11",
    );
  });
});
