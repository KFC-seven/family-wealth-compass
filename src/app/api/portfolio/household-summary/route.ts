import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { decimalToNumber } from "@/server/finance/mappers";

export async function GET() {
  try {
    const household = await prisma.household.findFirst({
      include: {
        members: {
          include: {
            accounts: true,
            holdings: { where: { status: "CURRENT" } },
          },
        },
      },
    });

    if (!household) {
      return createErrorResponse({ code: "NOT_FOUND", message: "未找到家庭数据" }, 404);
    }

    const allHoldings = household.members.flatMap((m) =>
      m.holdings.filter((h) => h.status === "CURRENT")
    );

    const totalAssets = allHoldings.reduce(
      (sum, h) => sum + decimalToNumber(h.currentMarketValue),
      0
    );
    const cashBalance = household.members.reduce(
      (sum, m) =>
        sum +
        decimalToNumber(
          m.accounts.reduce(
            (s, a) => s + decimalToNumber(a.type === "CASH" ? 0 : 0),
            0
          )
        ),
      0
    );

    const holdingReturn = allHoldings.reduce(
      (s, h) => s + decimalToNumber(h.holdingReturn),
      0
    );
    const realizedReturn = allHoldings.reduce(
      (s, h) => s + decimalToNumber(h.realizedReturn),
      0
    );
    const cumulativeReturn = allHoldings.reduce(
      (s, h) => s + decimalToNumber(h.cumulativeReturn),
      0
    );

    // Compute cost basis: marketValue - cumulativeReturn (same as mapApiHoldingToViewModel)
    const totalCostBasis = allHoldings.reduce((s, h) => {
      const mv = decimalToNumber(h.currentMarketValue);
      const cr = decimalToNumber(h.cumulativeReturn);
      return s + Math.max(0, mv - cr);
    }, 0);

    // Get latest PortfolioSnapshot (scopeType=HOUSEHOLD) for todayReturn
    const latestSnapshot = await prisma.portfolioSnapshot.findFirst({
      where: { scopeType: "HOUSEHOLD" },
      orderBy: { date: "desc" },
    });

    const todayReturn = latestSnapshot ? decimalToNumber(latestSnapshot.dailyReturn) : 0;

    return createSuccessResponse({
      householdId: household.id,
      name: household.name,
      totalAssets,
      cashBalance,
      memberCount: household.members.length,
      holdingReturn,
      realizedReturn,
      cumulativeReturn,
      todayReturn,
      holdingReturnRate: totalCostBasis > 0 ? holdingReturn / totalCostBasis : null,
      cumulativeReturnRate: totalCostBasis > 0 ? cumulativeReturn / totalCostBasis : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
