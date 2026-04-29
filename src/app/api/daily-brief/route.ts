import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { dateToISO } from "@/server/finance/mappers";

export async function GET() {
  try {
    const brief = await prisma.dailyBrief.findFirst({
      orderBy: { date: "desc" },
    });

    if (!brief) {
      return createErrorResponse({ code: "NOT_FOUND", message: "暂无简报" }, 404);
    }

    return createSuccessResponse({
      id: brief.id,
      date: brief.date.toISOString(),
      status: brief.status,
      generatedAt: dateToISO(brief.generatedAt),
      title: brief.title,
      summary: brief.summary,
      householdImpact: brief.householdImpact,
      marketOverview: brief.marketOverview,
      memberImpacts: brief.memberImpacts,
      riskAlerts: brief.riskAlerts,
      adviceCards: brief.adviceCards,
      newsItems: brief.newsItems,
      pushStatus: brief.pushStatus,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
