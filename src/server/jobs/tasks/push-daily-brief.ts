import { registerJob } from "../registry";
import type { JobDefinition, JobContext, JobResult } from "../types";
import { prisma } from "@/server/db/prisma";
import { getPushProvider } from "@/server/push/registry";
import { decimalToNumber } from "@/server/finance/mappers";

export const pushDailyBriefJob: JobDefinition = {
  name: "push-daily-brief",
  displayName: "推送每日简报",
  description: "将 DailyBrief 推送到微信通道",
  async execute(ctx: JobContext): Promise<JobResult> {
    try {
      const date = ctx.date ?? new Date().toISOString().slice(0, 10);
      const household = await prisma.household.findFirst();
      if (!household) {
        return { status: "SKIPPED", successCount: 0, failureCount: 0, skippedCount: 1, metadata: { reason: "无 Household" } };
      }

      const brief = await prisma.dailyBrief.findFirst({
        where: {
          householdId: household.id,
          date: {
            gte: new Date(date + "T00:00:00.000Z"),
            lt: new Date(date + "T23:59:59.999Z"),
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!brief) {
        return { status: "SKIPPED", successCount: 0, failureCount: 0, skippedCount: 1, metadata: { reason: `无 ${date} 的简报` } };
      }

      const provider = getPushProvider();
      const riskAlerts: any[] = Array.isArray(brief.riskAlerts) ? brief.riskAlerts as any[] : [];
      const adviceCards: any[] = Array.isArray(brief.adviceCards) ? brief.adviceCards as any[] : [];

      const snapshot = await prisma.portfolioSnapshot.findFirst({
        where: { householdId: household.id, scopeType: "HOUSEHOLD" },
        orderBy: { date: "desc" },
      });

      const result = await provider.sendDailyBrief({
        title: brief.title ?? "每日简报",
        summary: brief.summary ?? "",
        dailyReturn: snapshot ? decimalToNumber(snapshot.dailyReturn) : 0,
        riskAlerts: riskAlerts.map((a: any) => ({
          level: a.level ?? "medium",
          type: a.type ?? "",
          description: a.description ?? "",
        })),
        adviceCards: adviceCards.map((c: any) => ({
          adviceType: c.adviceType ?? "",
          relatedMember: c.relatedMember ?? "",
          relatedAssetName: c.relatedAssetName ?? "",
          reason: c.reason ?? "",
        })),
        includeTotalAssets: process.env.WECHAT_PUSH_INCLUDE_TOTAL_ASSETS === "true",
        includeMemberDetails: process.env.WECHAT_PUSH_INCLUDE_MEMBER_DETAILS === "true",
        includeAiAdvice: process.env.WECHAT_PUSH_INCLUDE_AI_ADVICE === "true",
        onlyHighRisk: process.env.WECHAT_PUSH_ONLY_HIGH_RISK === "true",
        totalAssets: snapshot ? decimalToNumber(snapshot.totalAssets) : undefined,
      });

      // Record PushNotification
      await prisma.pushNotification.create({
        data: {
          householdId: household.id,
          briefId: brief.id,
          provider: provider.name.toUpperCase().replace(/-/g, "_") as any,
          channel: provider.name,
          status: result.success ? "SENT" : "FAILED",
          title: brief.title ?? undefined,
          contentPreview: brief.summary?.slice(0, 200) ?? undefined,
          sentAt: result.success ? new Date(result.sentAt) : undefined,
          errorMessage: result.success ? undefined : result.message,
        },
      });

      // Update brief pushStatus
      await prisma.dailyBrief.update({
        where: { id: brief.id },
        data: {
          pushStatus: {
            pushed: result.success,
            channel: provider.name,
            pushTime: new Date().toISOString(),
            success: result.success,
          } as any,
        },
      });

      return {
        status: result.success ? "SUCCESS" : "FAILED",
        successCount: result.success ? 1 : 0,
        failureCount: result.success ? 0 : 1,
        skippedCount: 0,
        errorMessage: result.success ? undefined : result.message,
      };
    } catch (err) {
      return {
        status: "FAILED",
        successCount: 0, failureCount: 1, skippedCount: 0,
        errorMessage: (err as Error).message,
      };
    }
  },
};

registerJob(pushDailyBriefJob);
