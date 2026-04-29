import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, handleApiError } from "@/server/api/response";
import { decimalToNumber } from "@/server/finance/mappers";

export async function GET() {
  try {
    const holdings = await prisma.holding.findMany({
      where: { status: "CURRENT" },
      include: {
        asset: true,
        member: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = holdings.map((h) => ({
      id: h.id,
      memberId: h.memberId,
      memberName: h.member.name,
      accountId: h.accountId,
      accountName: h.account.name,
      assetId: h.assetId,
      assetName: h.asset.name,
      assetType: h.asset.type,
      quantity: decimalToNumber(h.quantity),
      currentPrice: decimalToNumber(h.currentPrice),
      marketValue: decimalToNumber(h.currentMarketValue),
      holdingReturn: decimalToNumber(h.holdingReturn),
      realizedReturn: decimalToNumber(h.realizedReturn),
      cumulativeReturn: decimalToNumber(h.cumulativeReturn),
      status: h.status,
    }));

    return createSuccessResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
