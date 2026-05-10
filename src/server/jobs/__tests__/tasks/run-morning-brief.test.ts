import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JobResult } from "../../types";

const { mockRunJobSequence } = vi.hoisted(() => ({
  mockRunJobSequence: vi.fn<() => Promise<JobResult[]>>(),
}));

vi.mock("@/server/jobs/runner", () => ({ runJobSequence: mockRunJobSequence }));

import { runMorningBriefJob } from "../../tasks/run-morning-brief";
import type { JobContext } from "../../types";

function makeCtx(overrides: Partial<JobContext> = {}): JobContext {
  return { jobName: "run-morning-brief", trigger: "SCHEDULER", jobRunId: "run-001", ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runMorningBriefJob", () => {
  it("returns SUCCESS when both sub-tasks succeed", async () => {
    mockRunJobSequence.mockResolvedValue([
      { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 },
      { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 },
    ]);

    const result = await runMorningBriefJob.execute(makeCtx());

    expect(result.status).toBe("SUCCESS");
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(0);
  });

  it("returns FAILED when both sub-tasks fail", async () => {
    mockRunJobSequence.mockResolvedValue([
      { status: "FAILED", successCount: 0, failureCount: 1, skippedCount: 0, errorMessage: "gen failed" },
      { status: "FAILED", successCount: 0, failureCount: 1, skippedCount: 0, errorMessage: "push failed" },
    ]);

    const result = await runMorningBriefJob.execute(makeCtx());

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("晨报生成和推送均失败");
    expect(result.failureCount).toBe(2);
  });

  it("returns PARTIAL when one sub-task fails", async () => {
    mockRunJobSequence.mockResolvedValue([
      { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 },
      { status: "FAILED", successCount: 0, failureCount: 1, skippedCount: 0, errorMessage: "push failed" },
    ]);

    const result = await runMorningBriefJob.execute(makeCtx());

    expect(result.status).toBe("PARTIAL");
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
  });

  it("passes trigger and date to runJobSequence", async () => {
    mockRunJobSequence.mockResolvedValue([
      { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 },
      { status: "SUCCESS", successCount: 1, failureCount: 0, skippedCount: 0 },
    ]);

    await runMorningBriefJob.execute(makeCtx({ trigger: "SCHEDULER", date: "2026-05-11" }));

    expect(mockRunJobSequence).toHaveBeenCalledWith(
      ["generate-daily-brief", "push-daily-brief"],
      "SCHEDULER",
      "2026-05-11",
    );
  });
});
