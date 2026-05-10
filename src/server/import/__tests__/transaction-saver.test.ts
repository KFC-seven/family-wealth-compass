import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    asset: { findFirst: vi.fn(), create: vi.fn() },
    holding: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    transaction: { create: vi.fn() },
    priceSnapshot: { upsert: vi.fn() },
    member: { findFirst: vi.fn() },
    account: { findFirst: vi.fn() },
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));

import { confirmTransactionRecords } from "@/server/import/transaction-saver";

const householdId = "hh-001";
const memberId = "mem-001";
const accountId = "acc-001";
const assetId = "ast-001";

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "row-001",
    memberId,
    accountId,
    assetName: "沪深300ETF",
    assetCode: "510300",
    assetType: "ETF",
    currency: "CNY",
    market: null,
    quantity: 1000,
    price: 4.0,
    marketValue: 4000,
    cost: 3800,
    dataDate: new Date("2026-05-08"),
    note: null,
    transactionType: "BUY",
    tradeDate: new Date("2026-05-08"),
    grossAmount: 4000,
    fee: 5,
    tax: 0,
    netAmount: 3995,
    cashImpact: null,
    realizedReturn: null,
    ...overrides,
  } as any;
}

function setupDefaults() {
  mockPrisma.member.findFirst.mockResolvedValue({ id: memberId });
  mockPrisma.account.findFirst.mockResolvedValue({ id: accountId });
  mockPrisma.asset.findFirst.mockResolvedValue(null);
  mockPrisma.asset.create.mockResolvedValue({
    id: assetId,
    name: "沪深300ETF",
    code: "510300",
    type: "ETF",
    currency: "CNY",
    market: null,
  });
  mockPrisma.holding.findFirst.mockResolvedValue(null);
  mockPrisma.holding.create.mockResolvedValue({
    id: "hld-001",
    quantity: 0,
    averageCost: 0,
    remainingCost: 0,
    currentPrice: 0,
    currentMarketValue: 0,
    holdingReturn: 0,
    realizedReturn: 0,
    cumulativeReturn: 0,
  });
  mockPrisma.holding.update.mockResolvedValue({});
  mockPrisma.transaction.create.mockResolvedValue({ id: "tx-001" });
  mockPrisma.priceSnapshot.upsert.mockResolvedValue({});
}

function resetAll() {
  Object.values(mockPrisma).forEach((m) => Object.values(m).forEach((f) => f.mockReset()));
}

describe("confirmTransactionRecords", () => {
  beforeEach(() => {
    resetAll();
    setupDefaults();
  });

  it("saves a BUY transaction and creates holding", async () => {
    const row = makeRow({ transactionType: "BUY", quantity: 500, price: 4.0, grossAmount: 2000, netAmount: 1995 });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    expect(result.ignoreCount).toBe(0);
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "BUY",
          cashImpact: expect.any(Number),
          realizedReturn: 0,
        }),
      }),
    );
    const call = mockPrisma.transaction.create.mock.calls[0][0];
    // cashImpact should be negative (money goes out)
    expect(parseFloat(call.data.cashImpact.toString())).toBeLessThan(0);
  });

  it("saves a SELL with realizedReturn and reduces holding", async () => {
    mockPrisma.holding.findFirst.mockResolvedValue({
      id: "hld-001",
      quantity: 1000,
      averageCost: 3.8,
      remainingCost: 3800,
      currentPrice: 4.0,
      currentMarketValue: 4000,
      holdingReturn: 200,
      realizedReturn: 0,
      cumulativeReturn: 200,
    });

    const row = makeRow({
      transactionType: "SELL",
      quantity: 300,
      price: 4.2,
      grossAmount: 1260,
      netAmount: 1260,
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    const call = mockPrisma.transaction.create.mock.calls[0][0];
    // cashImpact positive for SELL
    expect(parseFloat(call.data.cashImpact.toString())).toBeGreaterThan(0);
    // realizedReturn = netAmount - avgCost * quantity = 1260 - 3.8*300 = 1260 - 1140 = 120
    expect(parseFloat(call.data.realizedReturn.toString())).toBeGreaterThan(0);
  });

  it("rejects SELL when quantity exceeds holding", async () => {
    mockPrisma.holding.findFirst.mockResolvedValue({
      id: "hld-001",
      quantity: 100,
      averageCost: 3.8,
      remainingCost: 380,
      currentPrice: 4.0,
      currentMarketValue: 400,
      holdingReturn: 20,
      realizedReturn: 0,
      cumulativeReturn: 20,
    });

    const row = makeRow({ transactionType: "SELL", quantity: 500 });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(0);
    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toContain("超过持仓数量");
  });

  it("saves a DIVIDEND with positive realizedReturn", async () => {
    mockPrisma.holding.findFirst.mockResolvedValue({
      id: "hld-001",
      quantity: 1000,
      averageCost: 3.8,
      remainingCost: 3800,
      currentPrice: 4.0,
      holdingReturn: 200,
      realizedReturn: 50,
      cumulativeReturn: 250,
    });

    const row = makeRow({
      transactionType: "DIVIDEND",
      quantity: null,
      price: null,
      grossAmount: 200,
      netAmount: 200,
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    const call = mockPrisma.transaction.create.mock.calls[0][0];
    expect(parseFloat(call.data.realizedReturn.toString())).toBe(200);
    expect(parseFloat(call.data.cashImpact.toString())).toBe(200);
  });

  it("saves a DEPOSIT with zero realizedReturn", async () => {
    const row = makeRow({
      transactionType: "DEPOSIT",
      assetName: "",
      quantity: null,
      price: null,
      grossAmount: 5000,
      netAmount: 5000,
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    const call = mockPrisma.transaction.create.mock.calls[0][0];
    expect(call.data.type).toBe("DEPOSIT");
    expect(parseFloat(call.data.realizedReturn.toString())).toBe(0);
    expect(parseFloat(call.data.cashImpact.toString())).toBe(5000);
  });

  it("saves a WITHDRAW with negative cashImpact", async () => {
    const row = makeRow({
      transactionType: "WITHDRAW",
      assetName: "",
      quantity: null,
      price: null,
      grossAmount: 3000,
      netAmount: 3000,
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    const call = mockPrisma.transaction.create.mock.calls[0][0];
    expect(parseFloat(call.data.cashImpact.toString())).toBeLessThan(0);
    expect(parseFloat(call.data.realizedReturn.toString())).toBe(0);
  });

  it("saves a FEE with negative realizedReturn", async () => {
    mockPrisma.holding.findFirst.mockResolvedValue({
      id: "hld-001",
      quantity: 1000,
      averageCost: 3.8,
      remainingCost: 3800,
      currentPrice: 4.0,
      holdingReturn: 200,
      realizedReturn: 100,
      cumulativeReturn: 300,
    });

    const row = makeRow({
      transactionType: "FEE",
      quantity: null,
      price: null,
      grossAmount: 50,
      netAmount: 50,
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    const call = mockPrisma.transaction.create.mock.calls[0][0];
    expect(parseFloat(call.data.realizedReturn.toString())).toBeLessThan(0);
  });

  it("requires note for ADJUSTMENT", async () => {
    const row = makeRow({
      transactionType: "ADJUSTMENT",
      grossAmount: 100,
      netAmount: 100,
      note: null,
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toContain("备注");
  });

  it("saves ADJUSTMENT with note", async () => {
    const row = makeRow({
      transactionType: "ADJUSTMENT",
      grossAmount: 100,
      netAmount: 100,
      note: "手动调整：补充遗漏",
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    const call = mockPrisma.transaction.create.mock.calls[0][0];
    expect(call.data.type).toBe("ADJUSTMENT");
  });

  it("falls back to first member when memberId is missing", async () => {
    const row = makeRow({ memberId: null, transactionType: "BUY" });

    const result = await confirmTransactionRecords(householdId, [row]);
    expect(result.savedCount).toBe(1);
  });

  it("skips row when no member can be found", async () => {
    mockPrisma.member.findFirst.mockReset();
    mockPrisma.member.findFirst.mockResolvedValue(null);
    const row = makeRow({ memberId: null, transactionType: "BUY" });

    const result = await confirmTransactionRecords(householdId, [row]);
    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toBe("找不到成员");
  });

  it("skips BUY row with zero quantity", async () => {
    const row = makeRow({ transactionType: "BUY", quantity: 0 });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toContain("数量");
  });

  it("handles multiple rows with mixed results", async () => {
    mockPrisma.holding.findFirst.mockResolvedValue({
      id: "hld-001",
      quantity: 1000,
      averageCost: 3.8,
      remainingCost: 3800,
      currentPrice: 4.0,
      currentMarketValue: 4000,
      holdingReturn: 200,
      realizedReturn: 0,
      cumulativeReturn: 200,
    });

    const buy = makeRow({ id: "r1", transactionType: "BUY", quantity: 200 });
    const sell = makeRow({
      id: "r2",
      transactionType: "SELL",
      quantity: 1500,
      grossAmount: 6000,
      netAmount: 6000,
    }); // exceeds holding
    const div = makeRow({
      id: "r3",
      transactionType: "DIVIDEND",
      quantity: null,
      price: null,
      grossAmount: 100,
      netAmount: 100,
    });

    const result = await confirmTransactionRecords(householdId, [buy, sell, div]);

    expect(result.savedCount).toBe(2);
    expect(result.ignoreCount).toBe(1);
    expect(result.details).toHaveLength(3);
    expect(result.details.find((d) => d.rowId === "r1")?.saved).toBe(true);
    expect(result.details.find((d) => d.rowId === "r2")?.saved).toBe(false);
    expect(result.details.find((d) => d.rowId === "r3")?.saved).toBe(true);
  });

  it("creates asset if not found", async () => {
    mockPrisma.asset.findFirst.mockResolvedValue(null);
    mockPrisma.asset.create.mockResolvedValue({
      id: "ast-new",
      name: "新资产",
      code: "NEW001",
      type: "ETF",
      currency: "CNY",
      market: null,
    });

    const row = makeRow({ transactionType: "BUY", assetName: "新资产", assetCode: "NEW001" });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    expect(mockPrisma.asset.create).toHaveBeenCalled();
  });

  it("catches and records unexpected errors", async () => {
    mockPrisma.transaction.create.mockRejectedValue(new Error("DB connection lost"));

    const row = makeRow({ transactionType: "BUY" });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toContain("DB connection lost");
  });
});
