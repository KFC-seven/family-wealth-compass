import { Holding, Member, Household, Transaction, DailyReturn, ReturnBreakdown } from "@/types/finance";

export function calculateHoldingReturn(quantity: number, currentPrice: number, avgCost: number): number {
  return quantity * currentPrice - quantity * avgCost;
}

export function calculateHoldingReturnRate(quantity: number, avgCost: number, costBasis: number): number | null {
  if (costBasis === 0) return null;
  return (quantity * avgCost === 0) ? null : ((quantity * avgCost - costBasis) / costBasis - 1);
}

export function calculateRealizedReturn(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "SELL" || t.type === "DIVIDEND" || t.type === "INTEREST")
    .reduce((sum, t) => {
      if (t.type === "SELL") {
        return sum + t.amount - (t.fee || 0) - (t.tax || 0);
      }
      return sum + t.amount;
    }, 0);
}

export function calculateCumulativeReturn(holdingReturn: number, realizedReturn: number): number {
  return holdingReturn + realizedReturn;
}

export function calculateReturnRate(cumulativeReturn: number, totalInvested: number): number | null {
  if (totalInvested === 0) return null;
  return cumulativeReturn / totalInvested;
}

export function aggregateMemberReturns(member: Member): {
  totalAssets: number;
  holdingReturn: number;
  realizedReturn: number;
  cumulativeReturn: number;
} {
  const totalAssets = member.holdings.reduce((sum, h) => sum + h.marketValue, 0) + member.cashBalance;
  const holdingReturn = member.holdings.reduce((sum, h) => sum + h.holdingReturn, 0);
  const realizedReturn = member.holdings.reduce((sum, h) => sum + h.realizedReturn, 0);
  const cumulativeReturn = holdingReturn + realizedReturn;

  return { totalAssets, holdingReturn, realizedReturn, cumulativeReturn };
}

export function aggregateHouseholdReturns(members: Member[]): {
  totalAssets: number;
  holdingReturn: number;
  realizedReturn: number;
  cumulativeReturn: number;
} {
  return members.reduce(
    (acc, member) => {
      const memberAgg = aggregateMemberReturns(member);
      return {
        totalAssets: acc.totalAssets + memberAgg.totalAssets,
        holdingReturn: acc.holdingReturn + memberAgg.holdingReturn,
        realizedReturn: acc.realizedReturn + memberAgg.realizedReturn,
        cumulativeReturn: acc.cumulativeReturn + memberAgg.cumulativeReturn,
      };
    },
    { totalAssets: 0, holdingReturn: 0, realizedReturn: 0, cumulativeReturn: 0 }
  );
}

export function calculatePeriodReturn(
  dailyReturns: DailyReturn[],
  startDate: string,
  endDate: string
): number {
  return dailyReturns
    .filter((d) => d.date >= startDate && d.date <= endDate)
    .reduce((sum, d) => sum + d.value, 0);
}

export function calculatePositionWeight(marketValue: number, totalPortfolioValue: number): number {
  if (totalPortfolioValue === 0) return 0;
  return marketValue / totalPortfolioValue;
}

export function calculateMemberSummary(holdings: Holding[], cashBalance: number): {
  totalAssets: number;
  holdingReturn: number;
  realizedReturn: number;
  cumulativeReturn: number;
} {
  const currentHoldings = holdings.filter((h) => !h.isCleared);
  const totalMarketValue = currentHoldings.reduce((s, h) => s + h.marketValue, 0);
  const holdingReturn = currentHoldings.reduce((s, h) => s + h.holdingReturn, 0);
  const realizedReturn = holdings.reduce((s, h) => s + h.realizedReturn, 0);
  return {
    totalAssets: totalMarketValue + cashBalance,
    holdingReturn,
    realizedReturn,
    cumulativeReturn: holdingReturn + realizedReturn,
  };
}

export function calculateAccountSummary(holdings: Holding[], cashBalance: number): {
  totalValue: number;
  holdingReturn: number;
  realizedReturn: number;
  cumulativeReturn: number;
  holdingCount: number;
} {
  const currentHoldings = holdings.filter((h) => !h.isCleared);
  const totalMarketValue = currentHoldings.reduce((s, h) => s + h.marketValue, 0);
  const holdingReturn = currentHoldings.reduce((s, h) => s + h.holdingReturn, 0);
  const realizedReturn = currentHoldings.reduce((s, h) => s + h.realizedReturn, 0);
  return {
    totalValue: totalMarketValue + cashBalance,
    holdingReturn,
    realizedReturn,
    cumulativeReturn: holdingReturn + realizedReturn,
    holdingCount: currentHoldings.length,
  };
}

export function calculatePositionLifecycle(holding: Holding): {
  holdingReturn: number;
  realizedReturn: number;
  cumulativeReturn: number;
  cumulativeReturnRate: number | null;
  totalInvested: number;
} {
  return {
    holdingReturn: holding.holdingReturn,
    realizedReturn: holding.realizedReturn,
    cumulativeReturn: holding.cumulativeReturn,
    cumulativeReturnRate: holding.cumulativeReturnRate,
    totalInvested: holding.costBasis,
  };
}

export function calculateReturnBreakdown(
  holdingReturn: number,
  realizedReturn: number,
  dividendsInterest: number,
  feesTaxes: number
): ReturnBreakdown {
  const tradingRealized = realizedReturn - dividendsInterest + feesTaxes;
  return {
    holdingReturn,
    tradingRealized,
    dividendInterest: dividendsInterest,
    feesTaxes,
    cumulativeReturn: holdingReturn + realizedReturn,
  };
}

export function calculateClearedPositionSummary(
  totalInvested: number,
  totalReturned: number,
  dividendsInterest: number
): { realizedReturn: number; returnRate: number | null } {
  const realizedReturn = totalReturned - totalInvested + dividendsInterest;
  const returnRate = totalInvested > 0 ? realizedReturn / totalInvested : null;
  return { realizedReturn, returnRate };
}

export function calculateRemainingCostByAverageCost(
  previousCost: number,
  previousQuantity: number,
  buyAmount: number | null,
  buyFee: number | null,
  sellQuantity: number | null
): { remainingCost: number; remainingQuantity: number; newAvgCost: number } {
  if (buyAmount !== null) {
    const newCost = previousCost + buyAmount + (buyFee || 0);
    const newQty = previousQuantity + (buyAmount / (buyAmount / previousQuantity));
    // Simplified: real calc uses price
    return { remainingCost: newCost, remainingQuantity: newQty, newAvgCost: newCost / newQty };
  }
  if (sellQuantity !== null) {
    const avgCost = previousQuantity > 0 ? previousCost / previousQuantity : 0;
    const soldCost = avgCost * sellQuantity;
    const remainingCost = previousCost - soldCost;
    const remainingQuantity = previousQuantity - sellQuantity;
    return { remainingCost, remainingQuantity, newAvgCost: remainingQuantity > 0 ? remainingCost / remainingQuantity : 0 };
  }
  return { remainingCost: previousCost, remainingQuantity: previousQuantity, newAvgCost: previousCost / previousQuantity };
}
