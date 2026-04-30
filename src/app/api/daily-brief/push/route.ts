import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { prisma } from "@/server/db/prisma";
import { getPushProvider } from "@/server/push/registry";
import { decimalToNumber } from "@/server/finance/mappers";

export async function POST(req: Request) {
  try {
    const secret = process.env.PUSH_API_SECRET ?? process.env.BRIEF_API_SECRET;
    if (secret) {
      const provided = req.headers.get("x-push-api-secret");
      if (provided !== secret) return createErrorResponse({ code: "UNAUTHORIZED", message: "PUSH_API_SECRET 校验失败" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const date = body.date ?? new Date().toISOString().slice(0, 10);

    const household = await prisma.household.findFirst();
    if (!household) return createErrorResponse({ code: "NOT_FOUND", message: "无 Household" }, 404);

    const brief = await prisma.dailyBrief.findFirst({
      where: {
        householdId: household.id,
        date: { gte: new Date(date + "T00:00:00.000Z"), lt: new Date(date + "T23:59:59.999Z") },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!brief) return createErrorResponse({ code: "NOT_FOUND", message: `无 ${date} 的简报` }, 404);

    const provider = getPushProvider();
    const riskAlerts: any[] = Array.isArray(brief.riskAlerts) ? brief.riskAlerts as any[] : [];
    const adviceCards: any[] = Array.isArray(brief.adviceCards) ? brief.adviceCards as any[] : [];

    const snapshot = await prisma.portfolioSnapshot.findFirst({
      where: { householdId: household.id, scopeType: "HOUSEHOLD" },
      orderBy: { date: "desc" },
    });

    const result = await provider.sendDailyBrief({
      title: brief.title ?? "每日简报", summary: brief.summary ?? "",
      dailyReturn: snapshot ? decimalToNumber(snapshot.dailyReturn) : 0,
      riskAlerts: riskAlerts.map((a: any) => ({ level: a.level ?? "medium", type: a.type ?? "", description: a.description ?? "" })),
      adviceCards: adviceCards.map((c: any) => ({ adviceType: c.adviceType ?? "", relatedMember: c.relatedMember ?? "", relatedAssetName: c.relatedAssetName ?? "", reason: c.reason ?? "" })),
      includeTotalAssets: process.env.WECHAT_PUSH_INCLUDE_TOTAL_ASSETS === "true",
      includeMemberDetails: process.env.WECHAT_PUSH_INCLUDE_MEMBER_DETAILS === "true",
      includeAiAdvice: process.env.WECHAT_PUSH_INCLUDE_AI_ADVICE === "true",
      onlyHighRisk: process.env.WECHAT_PUSH_ONLY_HIGH_RISK === "true",
      totalAssets: snapshot ? decimalToNumber(snapshot.totalAssets) : undefined,
    });

    return createSuccessResponse({
      success: result.success, provider: result.provider, message: result.message,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
