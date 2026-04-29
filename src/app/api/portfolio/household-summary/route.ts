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

    const totalAssets = household.members.reduce(
      (sum, m) => sum + decimalToNumber(m.holdings.reduce((s, h) => s + decimalToNumber(h.currentMarketValue), 0)),
      0
    );
    const cashBalance = household.members.reduce(
      (sum, m) => sum + decimalToNumber(m.accounts.reduce((s, a) => s + decimalToNumber(a.type === "CASH" ? 0 : 0), 0)),
      0
    );

    return createSuccessResponse({
      householdId: household.id,
      name: household.name,
      totalAssets,
      cashBalance,
      memberCount: household.members.length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
