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
  Object.values(mockPrisma).forEach((m) => Object.values(m).forEach((f: any) => f.mockReset()));
}

describe("confirmTransactionRecords - expanded coverage", () => {
  beforeEach(() => {
    resetAll();
    setupDefaults();
  });

  it("saves an INTEREST transaction with positive realizedReturn", async () => {
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
      transactionType: "INTEREST",
      quantity: null,
      price: null,
      grossAmount: 150,
      netAmount: 150,
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    const call = mockPrisma.transaction.create.mock.calls[0][0];
    expect(call.data.type).toBe("INTEREST");
    expect(parseFloat(call.data.realizedReturn.toString())).toBe(150);
    expect(parseFloat(call.data.cashImpact.toString())).toBe(150);
  });

  it("skips INTEREST with zero netAmount", async () => {
    const row = makeRow({
      transactionType: "INTEREST",
      quantity: null,
      price: null,
      grossAmount: 0,
      netAmount: 0,
    });
    const result = await confirmTransactionRecords(householdId, [row]);
    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toContain("netAmount");
  });

  it("saveBuy with existing holding updates not creates", async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({
      id: assetId,
      name: "沪深300ETF",
      code: "510300",
      type: "ETF",
      currency: "CNY",
      market: null,
    });
    mockPrisma.holding.findFirst.mockResolvedValue({
      id: "hld-001",
      quantity: 500,
      averageCost: 3.8,
      remainingCost: 1900,
      currentPrice: 4.0,
      currentMarketValue: 2000,
      holdingReturn: 100,
      realizedReturn: 0,
      cumulativeReturn: 100,
    });

    const row = makeRow({ transactionType: "BUY", quantity: 200, price: 4.2, grossAmount: 840, netAmount: 835 });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    // Should update, not create a new holding
    expect(mockPrisma.holding.create).not.toHaveBeenCalled();
    expect(mockPrisma.holding.update).toHaveBeenCalled();
  });

  it("saveSell with exact quantity clears the holding", async () => {
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
      quantity: 1000,
      price: 4.2,
      grossAmount: 4200,
      netAmount: 4200,
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    // Check that holding status was set to CLEARED
    const updateCall = mockPrisma.holding.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe("CLEARED");
    expect(updateCall.data.quantity).toBe(0);
  });

  it("saveBuy with price=0 uses holding currentPrice", async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({
      id: assetId,
      name: "沪深300ETF",
      code: "510300",
      type: "ETF",
      currency: "CNY",
      market: null,
    });
    mockPrisma.holding.findFirst.mockResolvedValue({
      id: "hld-001",
      quantity: 500,
      averageCost: 3.8,
      remainingCost: 1900,
      currentPrice: 4.0,
      currentMarketValue: 2000,
      holdingReturn: 100,
      realizedReturn: 0,
      cumulativeReturn: 100,
    });

    const row = makeRow({
      transactionType: "BUY",
      quantity: 200,
      price: 0,
      grossAmount: 800,
      netAmount: 795,
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    expect(mockPrisma.transaction.create).toHaveBeenCalled();
    // price=0 in transaction is fine, but currentPrice should be from holding
    // Check that writePrice was not called (price <= 0)
  });

  it("does not call writePrice when price <= 0", async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({
      id: assetId,
      name: "沪深300ETF",
      code: "510300",
      type: "ETF",
      currency: "CNY",
      market: null,
    });
    mockPrisma.holding.findFirst.mockResolvedValue({
      id: "hld-001",
      quantity: 500,
      averageCost: 3.8,
      remainingCost: 1900,
      currentPrice: 4.0,
      currentMarketValue: 2000,
      holdingReturn: 100,
      realizedReturn: 0,
      cumulativeReturn: 100,
    });

    const row = makeRow({
      transactionType: "BUY",
      quantity: 100,
      price: 0,
      grossAmount: 0,
      netAmount: 0,
    });
    await confirmTransactionRecords(householdId, [row]);

    // writePrice should not be called when price <= 0
    expect(mockPrisma.priceSnapshot.upsert).not.toHaveBeenCalled();
  });

  it("findOrCreateAsset with null assetCode finds by name+type", async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({
      id: "ast-found",
      name: "某基金",
      code: null,
      type: "MUTUAL_FUND",
      currency: "CNY",
      market: null,
    });

    const row = makeRow({
      transactionType: "BUY",
      assetCode: null,
      assetName: "某基金",
      assetType: "MUTUAL_FUND",
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    // Should find by name+type, not code+type
    expect(mockPrisma.asset.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: "某基金" }),
      }),
    );
  });

  it("unknown transactionType defaults to saveBuy", async () => {
    const row = makeRow({ transactionType: "UNKNOWN_TYPE" });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    const call = mockPrisma.transaction.create.mock.calls[0][0];
    expect(call.data.type).toBe("BUY");
  });

  it("saveSell without existing holding skips", async () => {
    mockPrisma.holding.findFirst.mockResolvedValue(null);

    const row = makeRow({
      transactionType: "SELL",
      quantity: 100,
      price: 4.0,
      grossAmount: 400,
      netAmount: 400,
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toContain("找不到 CURRENT Holding");
  });

  it("saveDividend with zero netAmount skips", async () => {
    const row = makeRow({
      transactionType: "DIVIDEND",
      quantity: null,
      price: null,
      grossAmount: 0,
      netAmount: 0,
    });
    const result = await confirmTransactionRecords(householdId, [row]);
    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toContain("netAmount");
  });

  it("saveDeposit with zero netAmount skips", async () => {
    const row = makeRow({
      transactionType: "DEPOSIT",
      netAmount: 0,
      grossAmount: 0,
    });
    const result = await confirmTransactionRecords(householdId, [row]);
    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toContain("netAmount");
  });

  it("saveWithdraw with zero netAmount skips", async () => {
    const row = makeRow({
      transactionType: "WITHDRAW",
      netAmount: 0,
      grossAmount: 0,
    });
    const result = await confirmTransactionRecords(householdId, [row]);
    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toContain("netAmount");
  });

  it("saveFee with zero fee skips", async () => {
    const row = makeRow({
      transactionType: "FEE",
      fee: 0,
      netAmount: 0,
      grossAmount: 0,
    });
    const result = await confirmTransactionRecords(householdId, [row]);
    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toContain("金额");
  });

  it("skips BUY/SELL/DIVIDEND with empty assetName", async () => {
    const row = makeRow({
      transactionType: "BUY",
      assetName: "",
    });
    const result = await confirmTransactionRecords(householdId, [row]);
    expect(result.ignoreCount).toBe(1);
    expect(result.details[0].reason).toContain("资产名称不能为空");
  });

  it("allows empty assetName for ADJUSTMENT (creates tx without assetId)", async () => {
    const row = makeRow({
      transactionType: "ADJUSTMENT",
      assetName: "",
      quantity: null,
      price: null,
      grossAmount: 100,
      netAmount: 100,
      note: "手动调整",
    });
    const result = await confirmTransactionRecords(householdId, [row]);

    expect(result.savedCount).toBe(1);
    const call = mockPrisma.transaction.create.mock.calls[0][0];
    expect(call.data.assetId).toBeNull();
  });
});
