import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    holding: { findMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));

import { refreshHoldingSnapshotsJob } from "../../tasks/refresh-holding-snapshots";
import type { JobContext } from "../../types";

function makeCtx(overrides: Partial<JobContext> = {}): JobContext {
  return { jobName: "refresh-holding-snapshots", trigger: "SCHEDULER", jobRunId: "run-001", ...overrides };
}

function makeHolding(overrides: Record<string, unknown> = {}) {
  return {
    id: "hld-001",
    quantity: 1000,
    averageCost: 5.0,
    remainingCost: 5000,
    currentPrice: 6.0,
    currentMarketValue: 6000,
    holdingReturn: 1000,
    realizedReturn: 200,
    cumulativeReturn: 1200,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("refreshHoldingSnapshotsJob", () => {
  it("returns SKIPPED when no CURRENT holdings exist", async () => {
    mockPrisma.holding.findMany.mockResolvedValue([]);

    const result = await refreshHoldingSnapshotsJob.execute(makeCtx());

    expect(result.status).toBe("SKIPPED");
    expect(result.metadata).toEqual(expect.objectContaining({ reason: "无 CURRENT 持仓需要刷新" }));
    expect(mockPrisma.holding.update).not.toHaveBeenCalled();
  });

  it("correctly calculates marketValue, holdingReturn and cumulativeReturn", async () => {
    mockPrisma.holding.findMany.mockResolvedValue([makeHolding()]);
    mockPrisma.holding.update.mockResolvedValue({});

    const result = await refreshHoldingSnapshotsJob.execute(makeCtx());

    expect(result.status).toBe("SUCCESS");
    expect(result.successCount).toBe(1);

    // marketValue = qty * price = 1000 * 6.0 = 6000
    // holdingReturn = marketValue - remainingCost = 6000 - 5000 = 1000
    // cumulativeReturn = holdingReturn + realizedReturn = 1000 + 200 = 1200
    expect(mockPrisma.holding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "hld-001" },
        data: expect.objectContaining({
          currentMarketValue: 6000,
          holdingReturn: 1000,
          cumulativeReturn: 1200,
        }),
      }),
    );
  });

  it("returns SUCCESS when all holdings refresh successfully", async () => {
    mockPrisma.holding.findMany.mockResolvedValue([
      makeHolding({ id: "hld-001" }),
      makeHolding({ id: "hld-002", quantity: 500, currentPrice: 10, remainingCost: 4000 }),
    ]);
    mockPrisma.holding.update.mockResolvedValue({});

    const result = await refreshHoldingSnapshotsJob.execute(makeCtx());

    expect(result.status).toBe("SUCCESS");
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(0);
  });

  it("returns PARTIAL when some holdings fail to update", async () => {
    mockPrisma.holding.findMany.mockResolvedValue([
      makeHolding({ id: "hld-001" }),
      makeHolding({ id: "hld-002" }),
    ]);
    mockPrisma.holding.update
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("DB error"));

    const result = await refreshHoldingSnapshotsJob.execute(makeCtx());

    expect(result.status).toBe("PARTIAL");
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
  });

  it("returns FAILED when all holdings fail to update", async () => {
    mockPrisma.holding.findMany.mockResolvedValue([
      makeHolding({ id: "hld-001" }),
      makeHolding({ id: "hld-002" }),
    ]);
    mockPrisma.holding.update.mockRejectedValue(new Error("connection lost"));

    const result = await refreshHoldingSnapshotsJob.execute(makeCtx());

    expect(result.status).toBe("FAILED");
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(2);
    expect(result.errorMessage).toBe("全部持仓刷新失败");
  });
});
