import { describe, it, expect } from "vitest";
import { checkSafety } from "../safety";
import type { AiBriefOutput } from "../types";

function makeOutput(overrides: Partial<AiBriefOutput> = {}): AiBriefOutput {
  return {
    title: "简报标题",
    summary: "今日总体平稳",
    marketOverview: [{ market: "A股", direction: "neutral", summary: "平稳" }],
    householdImpact: {
      direction: "neutral",
      summary: "平稳",
      mainContributors: [],
      mainRisks: [],
    },
    memberImpacts: [{ memberName: "张三", summary: "平稳", todayReturn: 0 }],
    riskAlerts: [],
    adviceCards: [],
    newsItems: [],
    disclaimer: "以上内容为辅助分析，不构成确定性投资指令",
    ...overrides,
  };
}

function makeAdviceCard(overrides: Record<string, unknown> = {}) {
  return {
    adviceType: "CONTINUE_OBSERVING",
    relatedMember: "张三",
    relatedAssetName: "沪深300ETF",
    reason: "当前持仓表现与投资理念一致，建议继续持有",
    riskLevel: "low",
    triggerCondition: "如基本面显著恶化则重新评估",
    uncertainty: "市场短期波动不可预测",
    philosophyMatch: "与平衡型偏好一致",
    ...overrides,
  };
}

describe("checkSafety", () => {
  it("passes for clean output", () => {
    const result = checkSafety(makeOutput());
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  describe("forbidden words", () => {
    const FORBIDDEN_WORDS = [
      "保证收益", "必赚", "无风险", "立即买入", "必须买入",
      "必须卖出", "满仓", "梭哈", "无脑加仓",
    ];

    for (const word of FORBIDDEN_WORDS) {
      it(`detects forbidden word: "${word}"`, () => {
        const output = makeOutput({ summary: `这是一个${word}的机会` });
        const result = checkSafety(output);
        expect(result.passed).toBe(false);
        expect(result.issues.some((i) => i.includes("禁止词"))).toBe(true);
      });
    }

    it('detects "稳赚"', () => {
      const output = makeOutput({ summary: "这是一个稳赚的策略" });
      expect(checkSafety(output).passed).toBe(false);
    });

    it('detects "包赚"', () => {
      const output = makeOutput({ summary: "包赚不赔" });
      expect(checkSafety(output).passed).toBe(false);
    });

    it('detects "躺赚"', () => {
      const output = makeOutput({ summary: "躺赚机会" });
      expect(checkSafety(output).passed).toBe(false);
    });

    it('detects "翻倍"', () => {
      const output = makeOutput({ summary: "翻倍机会" });
      expect(checkSafety(output).passed).toBe(false);
    });
  });

  describe("disclaimer", () => {
    it("fails when disclaimer is missing", () => {
      const output = makeOutput({ disclaimer: "" });
      const result = checkSafety(output);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.includes("免责声明"))).toBe(true);
    });

    it("fails when disclaimer is undefined", () => {
      const { disclaimer: _, ...withoutDisclaimer } = makeOutput();
      const result = checkSafety(withoutDisclaimer as any);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.includes("免责声明"))).toBe(true);
    });

    it("fails when disclaimer missing required text", () => {
      const output = makeOutput({ disclaimer: "以上内容仅供参考" });
      const result = checkSafety(output);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.includes("免责声明"))).toBe(true);
    });
  });

  describe("adviceCard validation", () => {
    it("passes when all adviceCards have reason and riskLevel", () => {
      const output = makeOutput({
        adviceCards: [
          makeAdviceCard(),
          makeAdviceCard({ adviceType: "NO_ACTION", triggerCondition: "", uncertainty: "" }),
        ],
      });
      const result = checkSafety(output);
      expect(result.passed).toBe(true);
    });

    it("fails when adviceCard reason is too short", () => {
      const output = makeOutput({
        adviceCards: [makeAdviceCard({ reason: "好" })],
      });
      const result = checkSafety(output);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.includes("reason"))).toBe(true);
    });

    it("fails when adviceCard riskLevel is missing", () => {
      const output = makeOutput({
        adviceCards: [makeAdviceCard({ riskLevel: "" })],
      });
      const result = checkSafety(output);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.includes("riskLevel"))).toBe(true);
    });

    it("fails when non-NO_ACTION card missing triggerCondition", () => {
      const output = makeOutput({
        adviceCards: [makeAdviceCard({ triggerCondition: "短" })],
      });
      const result = checkSafety(output);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.includes("triggerCondition"))).toBe(true);
    });

    it("allows NO_ACTION to skip triggerCondition", () => {
      const output = makeOutput({
        adviceCards: [makeAdviceCard({ adviceType: "NO_ACTION", triggerCondition: "" })],
      });
      const result = checkSafety(output);
      expect(result.passed).toBe(true);
    });

    it("fails when non-NO_ACTION card missing uncertainty", () => {
      const output = makeOutput({
        adviceCards: [makeAdviceCard({ uncertainty: "" })],
      });
      const result = checkSafety(output);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.includes("uncertainty"))).toBe(true);
    });

    it("allows NO_ACTION to skip uncertainty", () => {
      const output = makeOutput({
        adviceCards: [makeAdviceCard({ adviceType: "NO_ACTION", uncertainty: "" })],
      });
      const result = checkSafety(output);
      expect(result.passed).toBe(true);
    });

    it("fails when philosophyMatch is too short", () => {
      const output = makeOutput({
        adviceCards: [makeAdviceCard({ philosophyMatch: "AB" })],
      });
      const result = checkSafety(output);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.includes("philosophyMatch"))).toBe(true);
    });
  });
});
