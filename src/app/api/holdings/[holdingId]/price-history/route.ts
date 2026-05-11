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
      select: { assetId: true },
    });

    if (!holding) {
      return createErrorResponse({ code: "NOT_FOUND", message: "Holding not found" }, 404);
    }

    const [priceSnapshots, markerTransactions] = await Promise.all([
      prisma.priceSnapshot.findMany({
        where: { assetId: holding.assetId },
        orderBy: { date: "asc" },
      }),
      prisma.transaction.findMany({
        where: { holdingId, type: { in: ["BUY", "SELL", "DIVIDEND"] } },
        orderBy: { tradeDate: "asc" },
      }),
    ]);

    return createSuccessResponse({
      prices: priceSnapshots.map((ps) => ({
        date: dateToISO(ps.date)!.substring(0, 10),
        price: decimalToNumber(ps.price),
      })),
      markers: markerTransactions.map((t) => ({
        date: dateToISO(t.tradeDate)!.substring(0, 10),
        type: t.type,
        quantity: decimalToNumber(t.quantity),
        price: decimalToNumber(t.price),
        amount: decimalToNumber(t.grossAmount),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
