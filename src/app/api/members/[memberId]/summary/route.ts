import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { decimalToNumber } from "@/server/finance/mappers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        accounts: true,
        holdings: {
          include: { asset: true },
        },
        investorProfile: true,
      },
    });

    if (!member) {
      return createErrorResponse({ code: "NOT_FOUND", message: "成员不存在" }, 404);
    }

    const totalAssets = member.holdings.reduce(
      (sum, h) => sum + decimalToNumber(h.currentMarketValue),
      0
    );
    const holdingReturn = member.holdings.reduce(
      (sum, h) => sum + decimalToNumber(h.holdingReturn),
      0
    );
    const realizedReturn = member.holdings.reduce(
      (sum, h) => sum + decimalToNumber(h.realizedReturn),
      0
    );
    const cumulativeReturn = member.holdings.reduce(
      (sum, h) => sum + decimalToNumber(h.cumulativeReturn),
      0
    );
    const currentHoldings = member.holdings.filter((h) => h.status === "CURRENT");
    const clearedHoldings = member.holdings.filter((h) => h.status === "CLEARED");

    return createSuccessResponse({
      memberId: member.id,
      name: member.name,
      displayName: member.displayName,
      roleLabel: member.roleLabel,
      isAdmin: member.isAdmin,
      totalAssets,
      cashBalance: 0,
      holdingReturn,
      realizedReturn,
      cumulativeReturn,
      holdingCount: currentHoldings.length,
      clearedCount: clearedHoldings.length,
      accountCount: member.accounts.length,
      riskPreference: member.investorProfile?.riskPreference ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
