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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ holdingId: string }> }
) {
  try {
    const { holdingId } = await params;
    const body = await req.json();

    const holding = await prisma.holding.findUnique({ where: { id: holdingId } });
    if (!holding) return createErrorResponse({ code: "NOT_FOUND", message: "持仓不存在" }, 404);

    const data: Record<string, unknown> = {};

    if (body.quantity !== undefined) data.quantity = body.quantity;
    if (body.averageCost !== undefined) data.averageCost = body.averageCost;
    if (body.currentPrice !== undefined) data.currentPrice = body.currentPrice;
    if (body.currentMarketValue !== undefined) data.currentMarketValue = body.currentMarketValue;
    if (body.remainingCost !== undefined) data.remainingCost = body.remainingCost;
    if (body.holdingReturn !== undefined) data.holdingReturn = body.holdingReturn;
    if (body.realizedReturn !== undefined) data.realizedReturn = body.realizedReturn;
    if (body.note !== undefined) data.note = body.note;

    // If asset name/code changed, update or create Asset
    if (body.assetName || body.assetCode || body.assetType) {
      const assetName = body.assetName as string || undefined;
      const assetCode = body.assetCode as string || undefined;
      const assetType = body.assetType as string || undefined;
      if (assetName || assetType) {
        let asset = await prisma.asset.findFirst({
          where: assetCode
            ? { type: assetType as any, code: assetCode }
            : { name: assetName!, type: assetType as any },
        });
        if (!asset && assetName) {
          asset = await prisma.asset.create({
            data: { name: assetName, code: assetCode ?? null, type: (assetType as any) ?? "OTHER", currency: "CNY" },
          });
        }
        if (asset) data.assetId = asset.id;
      }
    }

    if (Object.keys(data).length === 0) {
      return createErrorResponse({ code: "NO_DATA", message: "没有可更新的字段" }, 400);
    }

    const updated = await prisma.holding.update({
      where: { id: holdingId },
      data,
    });

    return createSuccessResponse({
      id: updated.id,
      updated: Object.keys(data),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
