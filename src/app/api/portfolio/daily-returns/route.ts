import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { decimalToNumber } from "@/server/finance/mappers";

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        scopeType: "HOUSEHOLD",
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "asc" },
      select: { date: true, dailyReturn: true },
    });

    const dailyReturns = snapshots.map((s) => ({
      date: s.date.toISOString().substring(0, 10),
      value: decimalToNumber(s.dailyReturn),
    }));

    return createSuccessResponse(dailyReturns);
  } catch (err) {
    return handleApiError(err);
  }
}
