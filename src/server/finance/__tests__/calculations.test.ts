import { describe, it, expect } from "vitest";
import {
  calculateHoldingReturn,
  calculateCumulativeReturn,
  calculateReturnRate,
  calculateRemainingCostByAverageCost,
} from "@/server/finance/calculations";

// ── calculateHoldingReturn (server) ──
describe("calculateHoldingReturn (server)", () => {
  it("returns marketValue - remainingCost for positive return", () => {
    expect(calculateHoldingReturn(10000, 8000)).toBe(2000);
  });

  it("returns marketValue when remainingCost is 0", () => {
    expect(calculateHoldingReturn(5000, 0)).toBe(5000);
  });

  it("returns negative when marketValue < remainingCost", () => {
    expect(calculateHoldingReturn(5000, 8000)).toBe(-3000);
  });

  it("returns 0 when both are 0", () => {
    expect(calculateHoldingReturn(0, 0)).toBe(0);
  });

  it("handles NaN gracefully (NaN - number = NaN)", () => {
    expect(calculateHoldingReturn(NaN, 1000)).toBeNaN();
  });

  it("handles negative values", () => {
    expect(calculateHoldingReturn(-1000, 2000)).toBe(-3000);
  });

  it("returns negative value when both are negative but cost is larger", () => {
    expect(calculateHoldingReturn(-500, -1000)).toBe(500);
  });
});

// ── calculateCumulativeReturn (server) ──
describe("calculateCumulativeReturn (server)", () => {
  it("returns sum of holdingReturn and realizedReturn", () => {
    expect(calculateCumulativeReturn(2000, 500)).toBe(2500);
  });

  it("returns 0 when both are 0", () => {
    expect(calculateCumulativeReturn(0, 0)).toBe(0);
  });

  it("handles negative returns", () => {
    expect(calculateCumulativeReturn(-2000, 500)).toBe(-1500);
  });

  it("handles NaN input", () => {
    expect(calculateCumulativeReturn(NaN, 500)).toBeNaN();
  });
});

// ── calculateReturnRate (server) ──
describe("calculateReturnRate (server)", () => {
  it("returns value / base for normal case", () => {
    expect(calculateReturnRate(2000, 10000)).toBe(0.2);
  });

  it("returns null when base is 0", () => {
    expect(calculateReturnRate(100, 0)).toBeNull();
  });

  it("handles negative base", () => {
    expect(calculateReturnRate(100, -1000)).toBe(-0.1);
  });

  it("returns null when both are 0", () => {
    expect(calculateReturnRate(0, 0)).toBeNull();
  });

  it("returns 0 when value is 0 and base is non-zero", () => {
    expect(calculateReturnRate(0, 10000)).toBe(0);
  });

  it("handles negative value", () => {
    expect(calculateReturnRate(-500, 10000)).toBe(-0.05);
  });
});

// ── calculateRemainingCostByAverageCost (server) ──
describe("calculateRemainingCostByAverageCost (server)", () => {
  // Buy scenario
  it("handles buy scenario: adds cost and infers quantity from avgCost", () => {
    // previousCost=5000, previousQuantity=1000 => avgCost=5
    // buyAmount=2000 => inferred qty = 2000 / 5 = 400
    const result = calculateRemainingCostByAverageCost(5000, 1000, 2000, null);
    expect(result.remainingCost).toBe(7000);
    expect(result.remainingQuantity).toBe(1400); // 1000 + 400
    expect(result.avgCost).toBe(5); // 7000 / 1400
  });

  // Sell scenario
  it("handles sell scenario: reduces cost and quantity proportionally", () => {
    // avgCost=5, sell 300 => soldCost=1500
    const result = calculateRemainingCostByAverageCost(5000, 1000, null, 300);
    expect(result.remainingCost).toBe(3500); // 5000 - 1500
    expect(result.remainingQuantity).toBe(700); // 1000 - 300
    expect(result.avgCost).toBe(5);
  });

  // Full sell
  it("handles full sell: remainingCost=0, remainingQuantity=0", () => {
    const result = calculateRemainingCostByAverageCost(5000, 1000, null, 1000);
    expect(result.remainingCost).toBe(0);
    expect(result.remainingQuantity).toBe(0);
    expect(result.avgCost).toBe(5);
  });

  // Zero quantity
  it("returns avgCost=0 when previousQuantity is 0 and no buy/sell", () => {
    const result = calculateRemainingCostByAverageCost(0, 0, null, null);
    expect(result.remainingCost).toBe(0);
    expect(result.remainingQuantity).toBe(0);
    expect(result.avgCost).toBe(0);
  });

  // No buy or sell: returns unchanged
  it("returns unchanged when no buy or sell", () => {
    const result = calculateRemainingCostByAverageCost(5000, 1000, null, null);
    expect(result.remainingCost).toBe(5000);
    expect(result.remainingQuantity).toBe(1000);
    expect(result.avgCost).toBe(5);
  });

  // Buy with zero previous quantity
  it("handles buy with zero previous quantity (infers price=1)", () => {
    // previousCost=0, previousQuantity=0 => avgCost would be 0
    // buyAmount / (prevCost/prevQty) => buyAmount / (0/0) guarded by ternary:
    // previousQuantity > 0 ? prevCost/prevQty : 1 => falls to 1
    const result = calculateRemainingCostByAverageCost(0, 0, 500, null);
    expect(result.remainingCost).toBe(500);
    expect(result.remainingQuantity).toBe(500); // 0 + 500/1
    expect(result.avgCost).toBe(1); // 500 / 500
  });

  // Sell more than quantity: Math.max prevents negative
  it("clamps remainingCost and remainingQuantity to 0 when selling more than held", () => {
    const result = calculateRemainingCostByAverageCost(5000, 1000, null, 1500);
    expect(result.remainingCost).toBe(0);
    expect(result.remainingQuantity).toBe(0);
    expect(result.avgCost).toBe(5);
  });

  // BuyAmount is 0 — treated as "no buy" because buyAmount > 0 check
  it("returns unchanged when buyAmount is 0", () => {
    const result = calculateRemainingCostByAverageCost(5000, 1000, 0, null);
    expect(result.remainingCost).toBe(5000);
    expect(result.remainingQuantity).toBe(1000);
  });

  // SellQuantity is 0 — treated as "no sell"
  it("returns unchanged when sellQuantity is 0", () => {
    const result = calculateRemainingCostByAverageCost(5000, 1000, null, 0);
    expect(result.remainingCost).toBe(5000);
    expect(result.remainingQuantity).toBe(1000);
  });

  // BuyAmount > 0 takes priority over sellQuantity
  it("prefers buy over sell when both provided", () => {
    const result = calculateRemainingCostByAverageCost(5000, 1000, 3000, 500);
    expect(result.remainingCost).toBe(8000); // buy path taken
  });
});
