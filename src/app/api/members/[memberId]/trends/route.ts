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

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        scopeType: "MEMBER",
        scopeId: memberId,
      },
      orderBy: { date: "asc" },
    });

    // Daily returns: last 30 records (value = dailyReturn)
    const dailyReturns = snapshots.slice(-30).map((s) => ({
      date: s.date.toISOString().substring(0, 10),
      value: decimalToNumber(s.dailyReturn),
    }));

    // Monthly assets: aggregate by month, last 12 months
    // For each month, take the last snapshot's totalAssets
    const monthMap = new Map<string, number>();
    for (const s of snapshots) {
      const monthKey = s.date.toISOString().substring(0, 7);
      monthMap.set(monthKey, decimalToNumber(s.totalAssets));
    }
    const monthlyAssets = Array.from(monthMap.entries())
      .slice(-12)
      .map(([month, value]) => ({ month, value }));

    return createSuccessResponse({ dailyReturns, monthlyAssets });
  } catch (err) {
    return handleApiError(err);
  }
}
