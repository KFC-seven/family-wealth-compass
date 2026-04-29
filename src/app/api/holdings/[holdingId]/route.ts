import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { decimalToNumber, dateToISO } from "@/server/finance/mappers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ holdingId: string }> }
) {
  try {
    const { holdingId } = await params;

    const holding = await prisma.holding.findUnique({
      where: { id: holdingId },
      include: {
        asset: true,
        member: { select: { id: true, name: true } },
        account: { select: { id: true, name: true, type: true } },
        transactions: {
          orderBy: { tradeDate: "asc" },
        },
      },
    });

    if (!holding) {
      return createErrorResponse({ code: "NOT_FOUND", message: "持仓不存在" }, 404);
    }

    return createSuccessResponse({
      id: holding.id,
      memberId: holding.memberId,
      memberName: holding.member.name,
      accountId: holding.accountId,
      accountName: holding.account.name,
      accountType: holding.account.type,
      assetId: holding.assetId,
      assetName: holding.asset.name,
      assetType: holding.asset.type,
      assetCode: holding.asset.code,
      assetMarket: holding.asset.market,
      status: holding.status,
      quantity: decimalToNumber(holding.quantity),
      averageCost: decimalToNumber(holding.averageCost),
      remainingCost: decimalToNumber(holding.remainingCost),
      currentPrice: decimalToNumber(holding.currentPrice),
      marketValue: decimalToNumber(holding.currentMarketValue),
      holdingReturn: decimalToNumber(holding.holdingReturn),
      realizedReturn: decimalToNumber(holding.realizedReturn),
      cumulativeReturn: decimalToNumber(holding.cumulativeReturn),
      openedAt: dateToISO(holding.createdAt),
      updatedAt: dateToISO(holding.updatedAt),
      transactions: holding.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        tradeDate: dateToISO(t.tradeDate),
        quantity: decimalToNumber(t.quantity),
        price: decimalToNumber(t.price),
        grossAmount: decimalToNumber(t.grossAmount),
        fee: decimalToNumber(t.fee),
        tax: decimalToNumber(t.tax),
        netAmount: decimalToNumber(t.netAmount),
        note: t.note,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
