import type { TransactionType } from "@/generated/prisma/enums";

export function calculateHoldingReturn(marketValue: number, remainingCost: number): number {
  return marketValue - remainingCost;
}

export function calculateCumulativeReturn(holdingReturn: number, realizedReturn: number): number {
  return holdingReturn + realizedReturn;
}

export function calculateReturnRate(value: number, base: number): number | null {
  if (base === 0) return null;
  return value / base;
}

export function calculateRemainingCostByAverageCost(
  previousCost: number,
  previousQuantity: number,
  buyAmount: number | null,
  sellQuantity: number | null
): { remainingCost: number; remainingQuantity: number; avgCost: number } {
  if (buyAmount !== null && buyAmount > 0) {
    const newCost = previousCost + buyAmount;
    const newQty = previousQuantity + (buyAmount / (previousQuantity > 0 ? previousCost / previousQuantity : 1));
    return {
      remainingCost: newCost,
      remainingQuantity: newQty,
      avgCost: newQty > 0 ? newCost / newQty : 0,
    };
  }
  if (sellQuantity !== null && sellQuantity > 0 && previousQuantity > 0) {
    const avgCost = previousCost / previousQuantity;
    const soldCost = avgCost * sellQuantity;
    return {
      remainingCost: Math.max(0, previousCost - soldCost),
      remainingQuantity: Math.max(0, previousQuantity - sellQuantity),
      avgCost,
    };
  }
  return {
    remainingCost: previousCost,
    remainingQuantity: previousQuantity,
    avgCost: previousQuantity > 0 ? previousCost / previousQuantity : 0,
  };
}
