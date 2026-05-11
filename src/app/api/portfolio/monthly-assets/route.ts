import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { decimalToNumber } from "@/server/finance/mappers";

export async function GET() {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        scopeType: "HOUSEHOLD",
        date: { gte: twelveMonthsAgo },
      },
      orderBy: { date: "asc" },
      select: { date: true, totalAssets: true },
    });

    // Aggregate by month: last record per month wins
    const monthMap = new Map<string, number>();
    for (const s of snapshots) {
      const monthKey = s.date.toISOString().substring(0, 7); // "YYYY-MM"
      monthMap.set(monthKey, decimalToNumber(s.totalAssets));
    }

    const monthlyAssets = Array.from(monthMap.entries())
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return createSuccessResponse(monthlyAssets);
  } catch (err) {
    return handleApiError(err);
  }
}
