import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGenerateDailyBrief } = vi.hoisted(() => ({
  mockGenerateDailyBrief: vi.fn(),
}));

vi.mock("@/server/brief/brief-generator", () => ({ generateDailyBrief: mockGenerateDailyBrief }));

import { generateDailyBriefJob } from "../../tasks/generate-daily-brief";
import type { JobContext } from "../../types";

function makeCtx(overrides: Partial<JobContext> = {}): JobContext {
  return { jobName: "generate-daily-brief", trigger: "SCHEDULER", jobRunId: "run-001", ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateDailyBriefJob", () => {
  it("returns SUCCESS when brief is generated successfully", async () => {
    mockGenerateDailyBrief.mockResolvedValue({
      id: "brief-001",
      status: "GENERATED",
      title: "今日简报",
      summary: "市场平稳运行",
    });

    const result = await generateDailyBriefJob.execute(makeCtx());

    expect(result.status).toBe("SUCCESS");
    expect(result.successCount).toBe(1);
    expect(result.metadata).toEqual(
      expect.objectContaining({ briefId: "brief-001" }),
    );
  });

  it("returns SKIPPED when brief status is not GENERATED", async () => {
    mockGenerateDailyBrief.mockResolvedValue({
      id: "brief-002",
      status: "PENDING",
    });

    const result = await generateDailyBriefJob.execute(makeCtx());

    expect(result.status).toBe("SKIPPED");
  });

  it("returns FAILED when brief generation throws", async () => {
    mockGenerateDailyBrief.mockRejectedValue(new Error("AI provider unavailable"));

    const result = await generateDailyBriefJob.execute(makeCtx());

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("AI provider unavailable");
    expect(result.failureCount).toBe(1);
  });

  it("passes date from context to brief generator", async () => {
    mockGenerateDailyBrief.mockResolvedValue({
      id: "brief-003",
      status: "GENERATED",
    });

    await generateDailyBriefJob.execute(makeCtx({ date: "2026-05-10" }));

    expect(mockGenerateDailyBrief).toHaveBeenCalledWith(
      expect.objectContaining({ date: "2026-05-10", force: true }),
    );
  });
});
