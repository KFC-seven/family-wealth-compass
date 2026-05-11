import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { validateBody } from "@/server/api/validators";
import { memberUpdateSchema } from "@/server/api/validators";
import { decimalToNumber, dateToISO } from "@/server/finance/mappers";

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
          include: {
            asset: true,
            account: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        investorProfile: true,
      },
    });

    if (!member) {
      return createErrorResponse({ code: "NOT_FOUND", message: "成员不存在" }, 404);
    }

    return createSuccessResponse({
      id: member.id,
      name: member.name,
      displayName: member.displayName,
      roleLabel: member.roleLabel,
      isAdmin: member.isAdmin,
      isActive: member.isActive,
      accounts: member.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        platform: a.platform,
        currency: a.currency,
      })),
      holdings: member.holdings.map((h) => ({
        id: h.id,
        assetId: h.assetId,
        assetName: h.asset.name,
        assetType: h.asset.type,
        accountId: h.accountId,
        accountName: h.account.name,
        status: h.status,
        quantity: decimalToNumber(h.quantity),
        averageCost: decimalToNumber(h.averageCost),
        currentPrice: decimalToNumber(h.currentPrice),
        marketValue: decimalToNumber(h.currentMarketValue),
        holdingReturn: decimalToNumber(h.holdingReturn),
        realizedReturn: decimalToNumber(h.realizedReturn),
        cumulativeReturn: decimalToNumber(h.cumulativeReturn),
        openedAt: dateToISO(h.createdAt),
      })),
      investorProfile: member.investorProfile ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const result = await validateBody(request, memberUpdateSchema);
    if ("error" in result) return result.error;

    const existing = await prisma.member.findUnique({ where: { id: memberId } });
    if (!existing) {
      return createErrorResponse({ code: "NOT_FOUND", message: "成员不存在" }, 404);
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: result.data as any,
    });

    return createSuccessResponse({
      id: updated.id,
      displayName: updated.displayName,
      roleLabel: updated.roleLabel,
      isAdmin: updated.isAdmin,
      isActive: updated.isActive,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
