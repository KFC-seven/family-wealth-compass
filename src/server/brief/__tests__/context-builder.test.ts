import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    household: { findFirst: vi.fn() },
    member: { findMany: vi.fn() },
    portfolioSnapshot: { findFirst: vi.fn() },
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));

import { buildBriefContext } from "../context-builder";

const mockDate = "2026-05-11";

function makeHousehold(overrides: Record<string, unknown> = {}) {
  return {
    id: "hh-001",
    name: "测试家庭",
    baseCurrency: "CNY",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: "mem-001",
    name: "张三",
    displayName: "张三",
    roleLabel: "家长",
    isActive: true,
    householdId: "hh-001",
    cashBalance: 50000,
    investorProfile: {
      id: "ip-001",
      riskPreference: "BALANCED",
      customPhilosophyText: "长期持有优质资产",
      memberId: "mem-001",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    holdings: [],
    ...overrides,
  } as any;
}

function makeHolding(overrides: Record<string, unknown> = {}) {
  return {
    id: "hld-001",
    memberId: "mem-001",
    assetId: "ast-001",
    status: "CURRENT",
    quantity: 1000,
    averageCost: 3.8,
    remainingCost: 3800,
    currentPrice: 4.0,
    currentMarketValue: 4000,
    holdingReturn: 200,
    realizedReturn: 50,
    cumulativeReturn: 250,
    asset: {
      id: "ast-001",
      name: "沪深300ETF",
      code: "510300",
      type: "ETF",
      currency: "CNY",
      market: null,
    },
    ...overrides,
  } as any;
}

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: "snap-001",
    householdId: "hh-001",
    date: new Date("2026-05-11"),
    scopeType: "HOUSEHOLD",
    totalAssets: 1000000,
    cashBalance: 50000,
    dailyReturn: 5000,
    holdingReturn: 30000,
    realizedReturn: 20000,
    cumulativeReturn: 80000,
    ...overrides,
  } as any;
}

function resetAll() {
  Object.values(mockPrisma).forEach((m: any) =>
    Object.values(m).forEach((f: any) => f.mockReset())
  );
}

describe("buildBriefContext", () => {
  beforeEach(() => {
    resetAll();
  });

  it("returns BriefContext with valid household and members", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.member.findMany.mockResolvedValue([
      makeMember({
        holdings: [makeHolding()],
      }),
    ]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(makeSnapshot());

    const ctx = await buildBriefContext(mockDate);

    expect(ctx.householdName).toBe("测试家庭");
    expect(ctx.baseCurrency).toBe("CNY");
    expect(ctx.date).toBe(mockDate);
    expect(ctx.totalAssets).toBe(1000000);
    expect(ctx.dailyReturn).toBe(5000);
    expect(ctx.cumulativeReturn).toBe(80000);
    expect(ctx.holdingReturn).toBe(30000);
    expect(ctx.realizedReturn).toBe(20000);
    expect(ctx.cashBalance).toBe(50000);
    expect(ctx.members).toHaveLength(1);
    expect(ctx.members[0].name).toBe("张三");
    expect(ctx.members[0].role).toBe("家长");
    expect(ctx.members[0].holdings).toHaveLength(1);
    expect(ctx.members[0].holdings[0].name).toBe("沪深300ETF");
    expect(ctx.newsHighlights).toHaveLength(2);
    expect(ctx.marketSummary).toBeTruthy();
  });

  it("throws when no household exists", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(null);

    await expect(buildBriefContext(mockDate)).rejects.toThrow("无 Household 数据");
  });

  it("returns with empty members array when no active members", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.member.findMany.mockResolvedValue([]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(makeSnapshot());

    const ctx = await buildBriefContext(mockDate);
    expect(ctx.members).toHaveLength(0);
    expect(ctx.totalAssets).toBe(1000000);
  });

  it("falls back to holding market value when snapshot totals are 0", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.member.findMany.mockResolvedValue([
      makeMember({
        holdings: [makeHolding({ currentMarketValue: 4000 })],
      }),
    ]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(
      makeSnapshot({ totalAssets: 0, dailyReturn: 0 })
    );

    const ctx = await buildBriefContext(mockDate);

    // totalAssets should be totalHoldingMv + cashBalance = 4000 + 50000
    expect(ctx.totalAssets).toBe(54000);
    expect(ctx.dailyReturn).toBe(0);
  });

  it("generates risk signals for concentrated positions (>30% weight)", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.member.findMany.mockResolvedValue([
      makeMember({
        holdings: [
          makeHolding({ id: "hld-001", currentMarketValue: 400000, asset: { name: "沪深300ETF", type: "ETF" } }),
          makeHolding({ id: "hld-002", currentMarketValue: 100000, asset: { name: "国债ETF", type: "ETF" } }),
        ],
      }),
    ]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(makeSnapshot());

    const ctx = await buildBriefContext(mockDate);
    const concentrationRisk = ctx.riskSignals.find((r) => r.type === "仓位集中");
    expect(concentrationRisk).toBeDefined();
    expect(concentrationRisk!.level).toBe("high");
    expect(concentrationRisk!.description).toContain("80.0%");
  });

  it("generates cash ratio warning when cash < 5%", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.member.findMany.mockResolvedValue([
      makeMember({
        cashBalance: 10000,
        holdings: [makeHolding({ currentMarketValue: 400000 })],
      }),
    ]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(
      makeSnapshot({ cashBalance: 10000, totalAssets: 500000 })
    );

    const ctx = await buildBriefContext(mockDate);
    const cashRisk = ctx.riskSignals.find((r) => r.type === "现金不足");
    expect(cashRisk).toBeDefined();
    expect(cashRisk!.level).toBe("medium");
  });

  it("does not generate cash warning when cash >= 5%", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.member.findMany.mockResolvedValue([
      makeMember({
        cashBalance: 50000,
        holdings: [makeHolding({ currentMarketValue: 100000 })],
      }),
    ]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(
      makeSnapshot({ cashBalance: 50000, totalAssets: 150000 })
    );

    const ctx = await buildBriefContext(mockDate);
    const cashRisk = ctx.riskSignals.find((r) => r.type === "现金不足");
    expect(cashRisk).toBeUndefined();
  });

  it("sets dailyReturn to 0 when no snapshot exists", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.member.findMany.mockResolvedValue([
      makeMember({
        holdings: [makeHolding()],
      }),
    ]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(null);

    const ctx = await buildBriefContext(mockDate);
    expect(ctx.dailyReturn).toBe(0);
    // totalAssets falls back to totalHoldingMv + cashBalance when snapshot is null.
    // cashBalance from snapshot is 0 (no snapshot), so totalAssets = 4000 + 0 = 4000
    expect(ctx.totalAssets).toBe(4000);
  });

  it("sets member philosophy from investorProfile", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.member.findMany.mockResolvedValue([
      makeMember({
        investorProfile: {
          riskPreference: "AGGRESSIVE",
          customPhilosophyText: "追求长期高回报",
        },
        holdings: [],
      }),
    ]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(makeSnapshot({ totalAssets: 0 }));

    const ctx = await buildBriefContext(mockDate);
    expect(ctx.members[0].philosophy).toBe("追求长期高回报");
    expect(ctx.members[0].riskPreference).toBe("AGGRESSIVE");
  });

  it("uses default philosophy when investorProfile is missing", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.member.findMany.mockResolvedValue([
      makeMember({ investorProfile: null, holdings: [] }),
    ]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(makeSnapshot({ totalAssets: 0 }));

    const ctx = await buildBriefContext(mockDate);
    expect(ctx.members[0].philosophy).toBe("未配置投资理念");
    expect(ctx.members[0].riskPreference).toBe("BALANCED");
  });

  it("divides dailyReturn equally among members", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.member.findMany.mockResolvedValue([
      makeMember({ id: "mem-001", name: "张三", holdings: [makeHolding()] }),
      makeMember({ id: "mem-002", name: "李四", holdings: [makeHolding()] }),
    ]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(makeSnapshot({ dailyReturn: 2000 }));

    const ctx = await buildBriefContext(mockDate);
    expect(ctx.members[0].dailyReturn).toBe(1000);
    expect(ctx.members[1].dailyReturn).toBe(1000);
  });

  it("always contains mock news highlights", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.member.findMany.mockResolvedValue([]);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue(makeSnapshot());

    const ctx = await buildBriefContext(mockDate);
    expect(ctx.newsHighlights.length).toBeGreaterThanOrEqual(2);
    expect(ctx.newsHighlights[0].title).toBeTruthy();
    expect(ctx.newsHighlights[0].impact).toBe("neutral");
    expect(ctx.newsHighlights[0].importance).toBe("medium");
  });
});
