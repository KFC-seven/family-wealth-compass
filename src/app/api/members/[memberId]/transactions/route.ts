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
      select: { id: true },
    });

    if (!member) {
      return createErrorResponse({ code: "NOT_FOUND", message: "成员不存在" }, 404);
    }

    const transactions = await prisma.transaction.findMany({
      where: { memberId },
      orderBy: { tradeDate: "desc" },
      take: 50,
      include: {
        asset: { select: { name: true } },
      },
    });

    const data = transactions.map((t) => ({
      id: t.id,
      memberId: t.memberId,
      accountId: t.accountId,
      assetId: t.assetId,
      type: t.type,
      tradeDate: t.tradeDate.toISOString().substring(0, 10),
      quantity: decimalToNumber(t.quantity),
      price: decimalToNumber(t.price),
      grossAmount: decimalToNumber(t.grossAmount),
      fee: decimalToNumber(t.fee),
      netAmount: decimalToNumber(t.netAmount),
      note: t.note,
    }));

    return createSuccessResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
