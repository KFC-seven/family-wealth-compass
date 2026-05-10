import { describe, it, expect } from "vitest";
import {
  calculateHoldingReturn,
  calculateHoldingReturnRate,
  calculateRealizedReturn,
  calculateCumulativeReturn,
  calculateReturnRate,
  aggregateMemberReturns,
  aggregateHouseholdReturns,
  calculatePeriodReturn,
  calculatePositionWeight,
  calculateMemberSummary,
  calculateAccountSummary,
  calculatePositionLifecycle,
  calculateReturnBreakdown,
  calculateClearedPositionSummary,
  calculateRemainingCostByAverageCost,
} from "@/lib/returns";
import type { Holding, Member, Transaction, DailyReturn } from "@/types/finance";

function makeHolding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: "hld-001", memberId: "mem-001", accountId: "acc-001", assetId: "ast-001",
    assetName: "Test Asset", assetType: "aShare", currency: "CNY",
    quantity: 1000, avgCost: 5, currentPrice: 6, marketValue: 6000,
    holdingReturn: 1000, holdingReturnRate: 0.2, realizedReturn: 300,
    cumulativeReturn: 1300, cumulativeReturnRate: 0.26, costBasis: 5000, weight: 0,
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-001", memberId: "mem-001", accountId: "acc-001", assetId: "ast-001",
    type: "BUY", date: "2026-01-15", amount: 5000, ...overrides,
  };
}

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: "mem-001", name: "Test Member", totalAssets: 10000, cashBalance: 2000,
    holdingReturn: 1000, realizedReturn: 300, cumulativeReturn: 1300,
    cumulativeReturnRate: null, holdings: [], accounts: [], ...overrides,
  };
}

describe("calculateHoldingReturn (client)", () => {
  it("calculates qty * (currentPrice - avgCost)", () => {
    expect(calculateHoldingReturn(1000, 6, 5)).toBe(1000);
  });
  it("returns 0 when quantity is 0", () => { expect(calculateHoldingReturn(0, 6, 5)).toBe(0); });
  it("handles negative return", () => { expect(calculateHoldingReturn(1000, 4, 5)).toBe(-1000); });
  it("handles zero values", () => { expect(calculateHoldingReturn(1000, 0, 0)).toBe(0); });
  it("handles NaN safely", () => { expect(calculateHoldingReturn(NaN, 6, 5)).toBeNaN(); });
});

describe("calculateHoldingReturnRate", () => {
  it("valid data", () => { expect(calculateHoldingReturnRate(1000, 5, 5000)).toBe(-1); });
  it("costBasis=0", () => { expect(calculateHoldingReturnRate(1000, 5, 0)).toBeNull(); });
  it("qty*avgCost=0", () => { expect(calculateHoldingReturnRate(0, 5, 5000)).toBeNull(); });
  it("avgCost=0", () => { expect(calculateHoldingReturnRate(1000, 0, 5000)).toBeNull(); });
});

describe("calculateRealizedReturn", () => {
  it("sums SELL transactions as amount - fee - tax", () => {
    const txs: Transaction[] = [
      makeTransaction({ type: "SELL", amount: 5000, fee: 10, tax: 5 }),
      makeTransaction({ type: "SELL", amount: 3000, fee: 5, tax: 3 }),
    ];
    expect(calculateRealizedReturn(txs)).toBe(5000 - 10 - 5 + 3000 - 5 - 3);
  });
  it("sums DIVIDEND as just amount", () => {
    const txs: Transaction[] = [
      makeTransaction({ type: "DIVIDEND", amount: 500 }),
      makeTransaction({ type: "DIVIDEND", amount: 300 }),
    ];
    expect(calculateRealizedReturn(txs)).toBe(800);
  });
  it("sums INTEREST as just amount", () => {
    const txs: Transaction[] = [makeTransaction({ type: "INTEREST", amount: 200 })];
    expect(calculateRealizedReturn(txs)).toBe(200);
  });
  it("ignores non-return types (BUY, DEPOSIT, WITHDRAW, FEE, ADJUSTMENT)", () => {
    const txs: Transaction[] = [
      makeTransaction({ type: "BUY", amount: 5000 }),
      makeTransaction({ type: "DEPOSIT", amount: 10000 }),
      makeTransaction({ type: "WITHDRAW", amount: 3000 }),
      makeTransaction({ type: "FEE", amount: 50 }),
      makeTransaction({ type: "ADJUSTMENT", amount: 100 }),
    ];
    expect(calculateRealizedReturn(txs)).toBe(0);
  });
  it("empty array", () => { expect(calculateRealizedReturn([])).toBe(0); });
  it("SELL without fee/tax", () => {
    const txs: Transaction[] = [makeTransaction({ type: "SELL", amount: 5000 })];
    expect(calculateRealizedReturn(txs)).toBe(5000);
  });
  it("negative fees", () => {
    const txs: Transaction[] = [makeTransaction({ type: "SELL", amount: 5000, fee: -10, tax: 5 })];
    expect(calculateRealizedReturn(txs)).toBe(5000 - (-10) - 5);
  });
  it("mixed types", () => {
    const txs: Transaction[] = [
      makeTransaction({ type: "SELL", amount: 10000, fee: 15, tax: 10 }),
      makeTransaction({ type: "DIVIDEND", amount: 500 }),
      makeTransaction({ type: "INTEREST", amount: 100 }),
    ];
    expect(calculateRealizedReturn(txs)).toBe(10000 - 15 - 10 + 500 + 100);
  });
});

describe("calculateCumulativeReturn (client)", () => {
  it("sum", () => { expect(calculateCumulativeReturn(2000, 500)).toBe(2500); });
  it("zero", () => { expect(calculateCumulativeReturn(0, 0)).toBe(0); });
  it("negative", () => { expect(calculateCumulativeReturn(-2000, 500)).toBe(-1500); });
});

describe("calculateReturnRate (client)", () => {
  it("normal", () => { expect(calculateReturnRate(2000, 10000)).toBe(0.2); });
  it("totalInvested=0", () => { expect(calculateReturnRate(100, 0)).toBeNull(); });
  it("negative", () => { expect(calculateReturnRate(-2000, 10000)).toBe(-0.2); });
  it("both 0", () => { expect(calculateReturnRate(0, 0)).toBeNull(); });
});

describe("aggregateMemberReturns", () => {
  it("aggregates holdings + cashBalance", () => {
    const m = makeMember({ cashBalance: 2000, holdings: [
      makeHolding({ marketValue: 6000, holdingReturn: 1000, realizedReturn: 300 }),
      makeHolding({ marketValue: 4000, holdingReturn: 500, realizedReturn: 100 }),
    ]});
    const r = aggregateMemberReturns(m);
    expect(r.totalAssets).toBe(12000);
    expect(r.holdingReturn).toBe(1500);
    expect(r.realizedReturn).toBe(400);
    expect(r.cumulativeReturn).toBe(1900);
  });
  it("no holdings", () => {
    const r = aggregateMemberReturns(makeMember({ cashBalance: 5000, holdings: [] }));
    expect(r.totalAssets).toBe(5000);
    expect(r.holdingReturn).toBe(0);
    expect(r.realizedReturn).toBe(0);
    expect(r.cumulativeReturn).toBe(0);
  });
  it("zero cashBalance", () => {
    const r = aggregateMemberReturns(makeMember({ cashBalance: 0, holdings: [makeHolding({ marketValue: 8000 })] }));
    expect(r.totalAssets).toBe(8000);
  });
});

describe("aggregateHouseholdReturns", () => {
  it("multiple members", () => {
    const r = aggregateHouseholdReturns([
      makeMember({ cashBalance: 2000, holdings: [makeHolding({ marketValue: 6000, holdingReturn: 1000, realizedReturn: 300 })] }),
      makeMember({ cashBalance: 1000, holdings: [makeHolding({ marketValue: 4000, holdingReturn: 500, realizedReturn: 100 })] }),
    ]);
    expect(r.totalAssets).toBe(13000);
    expect(r.holdingReturn).toBe(1500);
    expect(r.realizedReturn).toBe(400);
    expect(r.cumulativeReturn).toBe(1900);
  });
  it("empty", () => {
    const r = aggregateHouseholdReturns([]);
    expect(r.totalAssets).toBe(0);
    expect(r.holdingReturn).toBe(0);
    expect(r.realizedReturn).toBe(0);
    expect(r.cumulativeReturn).toBe(0);
  });
});

describe("calculatePeriodReturn", () => {
  const dr: DailyReturn[] = [
    { date: "2026-05-01", value: 100 },
    { date: "2026-05-02", value: -50 },
    { date: "2026-05-03", value: 200 },
    { date: "2026-05-10", value: 75 },
    { date: "2026-05-15", value: 25 },
  ];
  it("filters range", () => { expect(calculatePeriodReturn(dr, "2026-05-01", "2026-05-10")).toBe(325); });
  it("no match", () => { expect(calculatePeriodReturn(dr, "2026-06-01", "2026-06-30")).toBe(0); });
  it("all match", () => { expect(calculatePeriodReturn(dr, "2026-01-01", "2026-12-31")).toBe(350); });
  it("empty array", () => { expect(calculatePeriodReturn([], "2026-05-01", "2026-05-10")).toBe(0); });
  it("single day", () => { expect(calculatePeriodReturn(dr, "2026-05-02", "2026-05-02")).toBe(-50); });
});

describe("calculatePositionWeight", () => {
  it("normal", () => { expect(calculatePositionWeight(1000, 5000)).toBe(0.2); });
  it("total=0", () => { expect(calculatePositionWeight(1000, 0)).toBe(0); });
  it(">1", () => { expect(calculatePositionWeight(6000, 5000)).toBe(1.2); });
  it("both 0", () => { expect(calculatePositionWeight(0, 0)).toBe(0); });
  it("100%", () => { expect(calculatePositionWeight(5000, 5000)).toBe(1); });
});

describe("calculateMemberSummary", () => {
  it("non-cleared + cash", () => {
    const r = calculateMemberSummary([
      makeHolding({ marketValue: 6000, holdingReturn: 1000, realizedReturn: 300 }),
      makeHolding({ marketValue: 4000, holdingReturn: 500, realizedReturn: 100, isCleared: true }),
    ], 2000);
    expect(r.totalAssets).toBe(8000);
    expect(r.holdingReturn).toBe(1000);
    expect(r.realizedReturn).toBe(400);
    expect(r.cumulativeReturn).toBe(1400);
  });
  it("all cleared", () => {
    const r = calculateMemberSummary([makeHolding({ marketValue: 6000, isCleared: true })], 5000);
    expect(r.totalAssets).toBe(5000);
    expect(r.holdingReturn).toBe(0);
  });
  it("empty", () => {
    const r = calculateMemberSummary([], 3000);
    expect(r.totalAssets).toBe(3000);
    expect(r.holdingReturn).toBe(0);
    expect(r.realizedReturn).toBe(0);
    expect(r.cumulativeReturn).toBe(0);
  });
});

describe("calculateAccountSummary", () => {
  it("non-cleared + cash + count", () => {
    const r = calculateAccountSummary([
      makeHolding({ marketValue: 6000, holdingReturn: 1000, realizedReturn: 300 }),
      makeHolding({ marketValue: 4000, holdingReturn: 500, realizedReturn: 100 }),
      makeHolding({ marketValue: 2000, isCleared: true }),
    ], 3000);
    expect(r.totalValue).toBe(13000);
    expect(r.holdingReturn).toBe(1500);
    expect(r.realizedReturn).toBe(400);
    expect(r.cumulativeReturn).toBe(1900);
    expect(r.holdingCount).toBe(2);
  });
  it("empty", () => {
    const r = calculateAccountSummary([], 5000);
    expect(r.totalValue).toBe(5000);
    expect(r.holdingCount).toBe(0);
  });
});

describe("calculatePositionLifecycle", () => {
  it("returns lifecycle from holding", () => {
    const r = calculatePositionLifecycle(makeHolding({
      holdingReturn: 1000, realizedReturn: 300,
      cumulativeReturn: 1300, cumulativeReturnRate: 0.26, costBasis: 5000,
    }));
    expect(r.holdingReturn).toBe(1000);
    expect(r.realizedReturn).toBe(300);
    expect(r.cumulativeReturn).toBe(1300);
    expect(r.cumulativeReturnRate).toBe(0.26);
    expect(r.totalInvested).toBe(5000);
  });
  it("null rate", () => {
    const r = calculatePositionLifecycle(makeHolding({ cumulativeReturnRate: null }));
    expect(r.cumulativeReturnRate).toBeNull();
  });
});

describe("calculateReturnBreakdown", () => {
  it("standard", () => {
    const r = calculateReturnBreakdown(1000, 500, 200, 50);
    expect(r.holdingReturn).toBe(1000);
    expect(r.tradingRealized).toBe(350);
    expect(r.dividendInterest).toBe(200);
    expect(r.feesTaxes).toBe(50);
    expect(r.cumulativeReturn).toBe(1500);
  });
  it("zeros", () => {
    const r = calculateReturnBreakdown(0, 0, 0, 0);
    expect(r.holdingReturn).toBe(0);
    expect(r.tradingRealized).toBe(0);
    expect(r.dividendInterest).toBe(0);
    expect(r.feesTaxes).toBe(0);
    expect(r.cumulativeReturn).toBe(0);
  });
  it("negative fees", () => {
    const r = calculateReturnBreakdown(1000, 500, 200, -50);
    expect(r.tradingRealized).toBe(250);
  });
});

describe("calculateClearedPositionSummary", () => {
  it("profit", () => {
    const r = calculateClearedPositionSummary(10000, 12000, 500);
    expect(r.realizedReturn).toBe(2500);
    expect(r.returnRate).toBe(0.25);
  });
  it("loss", () => {
    const r = calculateClearedPositionSummary(10000, 8000, 0);
    expect(r.realizedReturn).toBe(-2000);
    expect(r.returnRate).toBe(-0.2);
  });
  it("totalInvested=0", () => {
    const r = calculateClearedPositionSummary(0, 5000, 100);
    expect(r.realizedReturn).toBe(5100);
    expect(r.returnRate).toBeNull();
  });
  it("dividends only", () => {
    const r = calculateClearedPositionSummary(5000, 5000, 200);
    expect(r.realizedReturn).toBe(200);
    expect(r.returnRate).toBe(0.04);
  });
  it("complete loss", () => {
    const r = calculateClearedPositionSummary(10000, 0, 0);
    expect(r.realizedReturn).toBe(-10000);
    expect(r.returnRate).toBe(-1);
  });
});

describe("calculateRemainingCostByAverageCost (returns.ts)", () => {
  it("Buy: quantity DOUBLED due to bug at line 170", () => {
    const r = calculateRemainingCostByAverageCost(5000, 1000, 2000, null, null);
    expect(r.remainingCost).toBe(7000);
    // Bug: buyAmount / (buyAmount / previousQuantity) = 2000 / (2000/1000) = 1000
    // newQty = 1000 + 1000 = 2000 (should be 1400)
    expect(r.remainingQuantity).toBe(2000);
    expect(r.newAvgCost).toBe(3.5);
  });
  it("Buy with fee", () => {
    const r = calculateRemainingCostByAverageCost(5000, 1000, 2000, 10, null);
    expect(r.remainingCost).toBe(7010);
    expect(r.remainingQuantity).toBe(2000);
  });
  it("Sell", () => {
    const r = calculateRemainingCostByAverageCost(5000, 1000, null, null, 300);
    expect(r.remainingCost).toBe(3500);
    expect(r.remainingQuantity).toBe(700);
    expect(r.newAvgCost).toBe(5);
  });
  it("Sell all", () => {
    const r = calculateRemainingCostByAverageCost(5000, 1000, null, null, 1000);
    expect(r.remainingCost).toBe(0);
    expect(r.remainingQuantity).toBe(0);
    expect(r.newAvgCost).toBe(0);
  });
  it("No buy or sell", () => {
    const r = calculateRemainingCostByAverageCost(5000, 1000, null, null, null);
    expect(r.remainingCost).toBe(5000);
    expect(r.remainingQuantity).toBe(1000);
    expect(r.newAvgCost).toBe(5);
  });
  it("Zero qty: avgCost NaN", () => {
    const r = calculateRemainingCostByAverageCost(0, 0, null, null, null);
    expect(r.remainingCost).toBe(0);
    expect(r.remainingQuantity).toBe(0);
    expect(r.newAvgCost).toBeNaN();
  });
  it("Buy with zero prev qty: Infinity", () => {
    const r = calculateRemainingCostByAverageCost(0, 0, 500, null, null);
    expect(r.remainingCost).toBe(500);
    expect(r.remainingQuantity).toBe(0);
    expect(r.newAvgCost).toBe(Infinity);
  });
  it("Sell with zero prev qty", () => {
    const r = calculateRemainingCostByAverageCost(0, 0, null, null, 100);
    expect(r.remainingCost).toBe(0);
    expect(r.remainingQuantity).toBe(-100);
    expect(r.newAvgCost).toBe(0);
  });
});
