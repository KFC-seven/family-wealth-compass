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
      select: { id: true },
    });

    if (!holding) {
      return createErrorResponse({ code: "NOT_FOUND", message: "持仓不存在" }, 404);
    }

    const transactions = await prisma.transaction.findMany({
      where: { holdingId },
      orderBy: { tradeDate: "asc" },
    });

    const data = transactions.map((t) => ({
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
    }));

    return createSuccessResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
