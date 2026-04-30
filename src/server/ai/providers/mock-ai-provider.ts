import type { AiProvider, AiBriefInput, AiBriefOutput, AiProviderHealth } from "../types";

/** Mock AI provider — 永远可用，不访问外部网络 */
export class MockAiProvider implements AiProvider {
  name = "mock";

  isEnabled(): boolean { return true; }

  async generateStructuredBrief(input: AiBriefInput): Promise<AiBriefOutput> {
    const topMember = input.members[0];
    const topHolding = topMember?.holdings[0];

    return {
      title: `${input.householdName} 每日投资简报 (${input.date})`,
      summary: `家庭总资产 ${(input.totalAssets / 10000).toFixed(1)}万，今日收益 ${input.dailyReturn >= 0 ? "+" : ""}${input.dailyReturn.toFixed(0)}元。整体平稳，无重大风险信号。`,
      marketOverview: [
        { market: "A股", direction: input.dailyReturn > 0 ? "positive" : "neutral", summary: "Mock 市场概述 — A股指数小幅波动" },
      ],
      householdImpact: {
        direction: input.dailyReturn > 1000 ? "positive" : input.dailyReturn < -1000 ? "negative" : "neutral",
        summary: input.dailyReturn > 0 ? "今日整体组合小幅上涨" : "今日整体组合小幅波动",
        mainContributors: input.members.slice(0, 2).map((m) => m.name),
        mainRisks: input.riskSignals.slice(0, 2).map((r) => r.description),
      },
      memberImpacts: input.members.slice(0, 3).map((m) => ({
        memberName: m.name,
        summary: `${m.name}今日收益 ${m.dailyReturn >= 0 ? "+" : ""}${m.dailyReturn.toFixed(0)}`,
        todayReturn: m.dailyReturn,
      })),
      riskAlerts: input.riskSignals.slice(0, 3).map((r) => ({
        level: r.level as any,
        type: r.type,
        relatedMember: r.member,
        description: r.description,
        relatedAsset: r.asset,
      })),
      adviceCards: topHolding ? [{
        adviceType: "CONTINUE_OBSERVING",
        relatedMember: topMember.name,
        relatedAssetName: topHolding.name,
        reason: "当前持仓表现与投资理念一致，建议继续持有并定期评估",
        riskLevel: "low",
        triggerCondition: "如基本面出现显著恶化或估值过高，重新评估",
        uncertainty: "市场短期波动不可预测，该建议基于当前公开信息",
        philosophyMatch: `与${topMember.name}的${topMember.riskPreference ?? "平衡"}偏好一致`,
        observationPeriod: "1个月",
        actionIntensity: "light",
      }] : [],
      newsItems: input.newsHighlights.slice(0, 3),
      disclaimer: "以上内容为基于持仓数据和公开信息的辅助分析，不构成确定性投资指令。Mock AI 生成，仅供参考。",
    };
  }

  async healthCheck(): Promise<AiProviderHealth> {
    return { status: "HEALTHY", message: "Mock AI 始终可用", checkedAt: new Date().toISOString() };
  }
}
