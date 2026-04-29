import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, handleApiError } from "@/server/api/response";
import { validateBody } from "@/server/api/validators";
import { transactionCreateSchema } from "@/server/api/validators";
import { decimalToNumber } from "@/server/finance/mappers";

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { tradeDate: "desc" },
      take: 50,
      include: {
        member: { select: { name: true } },
        asset: { select: { name: true } },
      },
    });

    const data = transactions.map((t) => ({
      id: t.id,
      memberId: t.memberId,
      memberName: t.member.name,
      assetName: t.asset?.name ?? null,
      type: t.type,
      tradeDate: t.tradeDate.toISOString(),
      quantity: decimalToNumber(t.quantity),
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

export async function POST(request: Request) {
  try {
    const result = await validateBody(request, transactionCreateSchema);
    if ("error" in result) return result.error;

    const tx = await prisma.transaction.create({
      data: {
        ...result.data,
        tradeDate: new Date(result.data.tradeDate),
      },
    });

    return createSuccessResponse({ id: tx.id }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
