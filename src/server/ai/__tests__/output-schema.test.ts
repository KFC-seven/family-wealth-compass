import { describe, it, expect } from "vitest";
import { dailyBriefAiOutputSchema, adviceCardSchema } from "../output-schema";

const validAdviceCard = {
  adviceType: "CONTINUE_OBSERVING",
  relatedMember: "张三",
  relatedAssetName: "沪深300ETF",
  reason: "当前持仓表现稳定，与投资理念一致",
  riskLevel: "low",
  triggerCondition: "如果基本面恶化则重新评估",
  uncertainty: "市场短期波动不可预测",
  philosophyMatch: "与平衡型偏好一致",
};

const validFullOutput = {
  title: "家庭财富罗盘每日简报",
  summary: "今日整体组合表现平稳，各类资产走势分化。",
  marketOverview: [
    { market: "A股", direction: "positive", summary: "上证指数小幅上涨" },
    { market: "美股", direction: "neutral", summary: "标普500横盘震荡" },
  ],
  householdImpact: {
    direction: "positive",
    summary: "整体组合小幅上涨",
    mainContributors: ["沪深300ETF"],
    mainRisks: ["市场波动风险"],
  },
  memberImpacts: [
    { memberName: "张三", summary: "今日收益+500", todayReturn: 500 },
  ],
  riskAlerts: [
    { level: "high", type: "仓位集中", relatedMember: "张三", description: "单一持仓权重过高" },
  ],
  adviceCards: [validAdviceCard],
  newsItems: [
    { title: "A股三大指数小幅波动", impact: "neutral", importance: "medium", summary: "市场整体平稳" },
  ],
  disclaimer: "以上内容为辅助分析，不构成确定性投资指令",
};

describe("adviceCardSchema", () => {
  it("passes for a valid advice card", () => {
    const result = adviceCardSchema.safeParse(validAdviceCard);
    expect(result.success).toBe(true);
  });

  it("passes with optional fields (observationPeriod, actionIntensity)", () => {
    const card = {
      ...validAdviceCard,
      observationPeriod: "1个月",
      actionIntensity: "light",
    };
    const result = adviceCardSchema.safeParse(card);
    expect(result.success).toBe(true);
  });

  it("passes with null optional fields (relatedHoldingId)", () => {
    const card = { ...validAdviceCard, relatedHoldingId: null };
    const result = adviceCardSchema.safeParse(card);
    expect(result.success).toBe(true);
  });

  it("fails with invalid adviceType", () => {
    const card = { ...validAdviceCard, adviceType: "INVALID_TYPE" };
    const result = adviceCardSchema.safeParse(card);
    expect(result.success).toBe(false);
  });

  it("fails with empty reason", () => {
    const card = { ...validAdviceCard, reason: "" };
    const result = adviceCardSchema.safeParse(card);
    expect(result.success).toBe(false);
  });

  it("fails with invalid riskLevel", () => {
    const card = { ...validAdviceCard, riskLevel: "超高" };
    const result = adviceCardSchema.safeParse(card);
    expect(result.success).toBe(false);
  });

  it("fails with empty triggerCondition", () => {
    const card = { ...validAdviceCard, triggerCondition: "" };
    const result = adviceCardSchema.safeParse(card);
    expect(result.success).toBe(false);
  });

  it("fails with missing uncertainty", () => {
    const { uncertainty: _, ...withoutUncertainty } = validAdviceCard;
    const result = adviceCardSchema.safeParse(withoutUncertainty);
    expect(result.success).toBe(false);
  });

  it("fails with invalid actionIntensity enum when provided", () => {
    const card = { ...validAdviceCard, actionIntensity: "very_high" };
    const result = adviceCardSchema.safeParse(card);
    expect(result.success).toBe(false);
  });
});

describe("dailyBriefAiOutputSchema", () => {
  it("passes for a valid full output", () => {
    const result = dailyBriefAiOutputSchema.safeParse(validFullOutput);
    expect(result.success).toBe(true);
  });

  it("passes with empty arrays", () => {
    const output = {
      ...validFullOutput,
      marketOverview: [],
      memberImpacts: [],
      riskAlerts: [],
      adviceCards: [],
      newsItems: [],
    };
    const result = dailyBriefAiOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("strips extra fields", () => {
    const output = { ...validFullOutput, extraField: "should be stripped" };
    const result = dailyBriefAiOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).extraField).toBeUndefined();
    }
  });

  it("fails with missing title", () => {
    const { title: _, ...withoutTitle } = validFullOutput;
    const result = dailyBriefAiOutputSchema.safeParse(withoutTitle);
    expect(result.success).toBe(false);
  });

  it("fails with empty title", () => {
    const output = { ...validFullOutput, title: "" };
    const result = dailyBriefAiOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("fails with empty summary", () => {
    const output = { ...validFullOutput, summary: "" };
    const result = dailyBriefAiOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("fails with invalid direction enum in marketOverview", () => {
    const output = {
      ...validFullOutput,
      marketOverview: [{ market: "A股", direction: "非常积极", summary: "test" }],
    };
    const result = dailyBriefAiOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("fails with invalid direction enum in householdImpact", () => {
    const output = {
      ...validFullOutput,
      householdImpact: { ...validFullOutput.householdImpact, direction: "超级" },
    };
    const result = dailyBriefAiOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("fails with invalid impact enum in newsItems", () => {
    const output = {
      ...validFullOutput,
      newsItems: [{ title: "test", impact: "unknown", importance: "medium", summary: "test" }],
    };
    const result = dailyBriefAiOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("fails with invalid importance enum in newsItems", () => {
    const output = {
      ...validFullOutput,
      newsItems: [{ title: "test", impact: "neutral", importance: "urgent", summary: "test" }],
    };
    const result = dailyBriefAiOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("fails with invalid risk level", () => {
    const output = {
      ...validFullOutput,
      riskAlerts: [{ level: "超高", type: "风险", relatedMember: "张三", description: "desc" }],
    };
    const result = dailyBriefAiOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("fails with advice card that fails sub-schema", () => {
    const output = {
      ...validFullOutput,
      adviceCards: [{ ...validAdviceCard, reason: "" }],
    };
    const result = dailyBriefAiOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });
});
