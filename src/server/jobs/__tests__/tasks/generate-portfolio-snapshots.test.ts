import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    household: { findFirst: vi.fn() },
    member: { findMany: vi.fn() },
    holding: { findMany: vi.fn(), findUnique: vi.fn() },
    transaction: { findMany: vi.fn() },
    portfolioSnapshot: { findFirst: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));

import { generatePortfolioSnapshotsJob } from "../../tasks/generate-portfolio-snapshots";
import type { JobContext } from "../../types";

function makeCtx(overrides: Partial<JobContext> = {}): JobContext {
  return { jobName: "generate-portfolio-snapshots", trigger: "SCHEDULER", jobRunId: "run-001", ...overrides };
}

function makeHolding(overrides: Record<string, unknown> = {}) {
  return {
    id: "hld-001",
    memberId: "mem-001",
    accountId: "acc-001",
    assetId: "ast-001",
    status: "CURRENT",
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

/** Reset all mocks and set up the standard mock chain for a typical scenario.
 *  Call sequence within execute():
 *   1. household.findFirst
 *   2. member.findMany (with include, inside generateHouseholdSnapshot)
 *   3. holding.findMany (CASH holdings, inside generateHouseholdSnapshot)
 *   4. transaction.findMany (cash balance, inside generateHouseholdSnapshot)
 *   5. portfolioSnapshot.findFirst (prev snapshot, inside generateHouseholdSnapshot)
 *   6. portfolioSnapshot.upsert (household snapshot, inside generateHouseholdSnapshot)
 *   7. member.findMany (simple, in main execute for member loop)
 *   8. holding.findMany (member holdings, inside generateMemberSnapshot)
 *   9. portfolioSnapshot.upsert (member snapshot, inside generateMemberSnapshot)
 *  10. holding.findMany (CURRENT, in main execute for holding loop)
 *  11. holding.findUnique (inside generateHoldingSnapshot)
 *  12. portfolioSnapshot.upsert (holding snapshot, inside generateHoldingSnapshot)
 */
function setupStandardMocks() {
  mockPrisma.household.findFirst.mockResolvedValue({ id: "hh-001" });

  // generateHouseholdSnapshot (with include)
  mockPrisma.member.findMany
    .mockResolvedValueOnce([{
      id: "mem-001", householdId: "hh-001", isActive: true,
      holdings: [makeHolding()],
      accounts: [],
    }]);

  // CASH holdings
  mockPrisma.holding.findMany.mockResolvedValueOnce([]);

  // cash-balance transactions
  mockPrisma.transaction.findMany.mockResolvedValue([]);

  // No previous snapshot
  mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(null);

  // Main execute: member loop
  mockPrisma.member.findMany
    .mockResolvedValueOnce([{ id: "mem-001", householdId: "hh-001", isActive: true }]);

  // generateMemberSnapshot: member's CURRENT holdings
  mockPrisma.holding.findMany.mockResolvedValueOnce([makeHolding()]);

  // Main execute: CURRENT holdings
  mockPrisma.holding.findMany.mockResolvedValueOnce([makeHolding()]);

  // generateHoldingSnapshot
  mockPrisma.holding.findUnique.mockResolvedValue(makeHolding());

  // Upserts: household, member, holding (in that order)
  mockPrisma.portfolioSnapshot.upsert
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({});
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generatePortfolioSnapshotsJob", () => {
  it("returns SKIPPED when no household exists", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(null);

    const result = await generatePortfolioSnapshotsJob.execute(makeCtx());

    expect(result.status).toBe("SKIPPED");
    expect(result.metadata).toEqual(expect.objectContaining({ reason: "无 Household 数据" }));
    expect(mockPrisma.portfolioSnapshot.upsert).not.toHaveBeenCalled();
  });

  it("generates household, member, and holding snapshots successfully", async () => {
    setupStandardMocks();

    const result = await generatePortfolioSnapshotsJob.execute(makeCtx({ date: "2026-05-11" }));

    expect(result.status).toBe("SUCCESS");
    // 1 household + 1 member + 1 holding = 3
    expect(result.successCount).toBe(3);
    expect(result.failureCount).toBe(0);
  });

  it("generates snapshots with correct id format", async () => {
    setupStandardMocks();

    await generatePortfolioSnapshotsJob.execute(makeCtx({ date: "2026-05-11" }));

    const upsertCalls = mockPrisma.portfolioSnapshot.upsert.mock.calls;
    const ids = upsertCalls.map((c) => c[0].where.id);

    expect(ids).toContain("hh-001_HOUSEHOLD_2026-05-11");
    expect(ids).toContain("mem-001_MEMBER_2026-05-11");
    expect(ids).toContain("hld-001_HOLDING_2026-05-11");
  });

  it("calculates dailyReturn when prevSnapshot exists", async () => {
    mockPrisma.household.findFirst.mockResolvedValue({ id: "hh-001" });
    // generateHouseholdSnapshot
    mockPrisma.member.findMany
      .mockResolvedValueOnce([{
        id: "mem-001", householdId: "hh-001", isActive: true,
        holdings: [makeHolding({ currentMarketValue: 6000 })],
        accounts: [],
      }]);
    mockPrisma.holding.findMany.mockResolvedValueOnce([]); // CASH
    // cash balance txns (empty)
    mockPrisma.transaction.findMany.mockResolvedValueOnce([]);
    // Prev snapshot
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue({
      id: "hh-001_HOUSEHOLD_2026-05-10",
      householdId: "hh-001",
      scopeType: "HOUSEHOLD",
      date: new Date("2026-05-10"),
      totalAssets: 5500,
      cumulativeReturn: 500,
    });
    // Today's external flow txns (empty)
    mockPrisma.transaction.findMany.mockResolvedValueOnce([]);
    // Household upsert
    mockPrisma.portfolioSnapshot.upsert.mockResolvedValueOnce({});

    // Main execute member loop
    mockPrisma.member.findMany
      .mockResolvedValueOnce([{ id: "mem-001", householdId: "hh-001", isActive: true }]);
    // generateMemberSnapshot holdings
    mockPrisma.holding.findMany.mockResolvedValueOnce([makeHolding()]);
    // Member upsert
    mockPrisma.portfolioSnapshot.upsert.mockResolvedValueOnce({});

    // Main execute holding loop
    mockPrisma.holding.findMany.mockResolvedValueOnce([makeHolding()]);
    // generateHoldingSnapshot
    mockPrisma.holding.findUnique.mockResolvedValue(makeHolding());
    // Holding upsert
    mockPrisma.portfolioSnapshot.upsert.mockResolvedValueOnce({});

    await generatePortfolioSnapshotsJob.execute(makeCtx({ date: "2026-05-11" }));

    const upsertCall = mockPrisma.portfolioSnapshot.upsert.mock.calls.find(
      (c: any) => c[0].where.id === "hh-001_HOUSEHOLD_2026-05-11",
    );
    expect(upsertCall).toBeDefined();

    const upsertData = upsertCall![0];
    // totalAssets = holdingMarketValue + max(0, cashBalance) = 6000 + 0 = 6000
    // dailyReturn = 6000 - 5500 - 0 = 500
    // cumulativeReturn = 500 + 500 = 1000
    expect(upsertData.update.totalAssets).toBe(6000);
    expect(upsertData.update.dailyReturn).toBe(500);
    expect(upsertData.update.cumulativeReturn).toBe(1000);
  });

  it("returns PARTIAL when some member snapshots fail", async () => {
    mockPrisma.household.findFirst.mockResolvedValue({ id: "hh-001" });
    // generateHouseholdSnapshot
    mockPrisma.member.findMany
      .mockResolvedValueOnce([{
        id: "mem-001", householdId: "hh-001", isActive: true,
        holdings: [],
        accounts: [],
      }]);
    mockPrisma.holding.findMany.mockResolvedValueOnce([]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(null);
    // Household upsert succeeds
    mockPrisma.portfolioSnapshot.upsert.mockResolvedValueOnce({});

    // Main execute member loop: 2 members
    mockPrisma.member.findMany
      .mockResolvedValueOnce([
        { id: "mem-001", householdId: "hh-001", isActive: true },
        { id: "mem-002", householdId: "hh-001", isActive: true },
      ]);

    // generateMemberSnapshot for mem-001: holdings empty -> upsert succeeds
    mockPrisma.holding.findMany.mockResolvedValueOnce([]);
    mockPrisma.portfolioSnapshot.upsert.mockResolvedValueOnce({});

    // generateMemberSnapshot for mem-002: holdings empty -> upsert FAILS
    mockPrisma.holding.findMany.mockResolvedValueOnce([]);
    mockPrisma.portfolioSnapshot.upsert.mockRejectedValueOnce(new Error("DB error"));

    // Main execute holding loop: no CURRENT holdings
    mockPrisma.holding.findMany.mockResolvedValueOnce([]);

    const result = await generatePortfolioSnapshotsJob.execute(makeCtx({ date: "2026-05-11" }));

    expect(result.status).toBe("PARTIAL");
    // household (1) + mem-001 (1) = 2 successes; mem-002 (1) = 1 failure
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(1);
  });

  it("returns FAILED when all snapshots fail", async () => {
    mockPrisma.household.findFirst.mockResolvedValue({ id: "hh-001" });
    // generateHouseholdSnapshot
    mockPrisma.member.findMany
      .mockResolvedValueOnce([{
        id: "mem-001", householdId: "hh-001", isActive: true,
        holdings: [],
        accounts: [],
      }]);
    mockPrisma.holding.findMany.mockResolvedValueOnce([]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(null);

    // Household snapshot upsert FAILS -> generateHouseholdSnapshot throws
    mockPrisma.portfolioSnapshot.upsert.mockRejectedValue(new Error("DB down"));

    const result = await generatePortfolioSnapshotsJob.execute(makeCtx({ date: "2026-05-11" }));

    expect(result.status).toBe("FAILED");
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBeGreaterThan(0);
    expect(result.errorMessage).toBe("快照生成全部失败");
  });
});
