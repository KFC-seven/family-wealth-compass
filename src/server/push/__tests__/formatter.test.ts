import { describe, it, expect } from "vitest";
import { formatBriefForPush, formatBriefForWeCom } from "../formatter";
import type { PushDailyBriefInput } from "../types";

function makeInput(overrides: Partial<PushDailyBriefInput> = {}): PushDailyBriefInput {
  return {
    title: "每日简报",
    summary: "今日组合收益+5000元，市场整体平稳运行。各类资产表现分化，A股小幅上涨。",
    dailyReturn: 5000,
    riskAlerts: [
      { level: "high", type: "仓位集中", description: "沪深300ETF权重48.5%，超过30%阈值" },
      { level: "medium", type: "现金不足", description: "现金占比3.2%，低于5%建议最低线" },
    ],
    adviceCards: [
      { adviceType: "CONTINUE_OBSERVING", relatedMember: "张三", relatedAssetName: "沪深300ETF", reason: "当前持仓表现与投资理念一致，建议继续持有" },
    ],
    includeTotalAssets: true,
    includeMemberDetails: true,
    includeAiAdvice: true,
    onlyHighRisk: false,
    totalAssets: 1000000,
    ...overrides,
  };
}

describe("formatBriefForPush", () => {
  it("returns full text with all options enabled", () => {
    const result = formatBriefForPush(makeInput());
    expect(result).toContain("家庭财富罗盘｜每日简报");
    expect(result).toContain("总资产：¥100.0万");
    expect(result).toContain("今日收益：+¥5000");
    expect(result).toContain("摘要：今日组合收益+5000元");
    expect(result).toContain("⚠ 风险提醒：");
    expect(result).toContain("💡 操作关注：");
    expect(result).toContain("查看完整简报：应用中查看");
  });

  it("filters risk alerts with onlyHighRisk", () => {
    const input = makeInput({ onlyHighRisk: true });
    const result = formatBriefForPush(input);
    // high risk alert description should be included
    expect(result).toContain("沪深300ETF权重48.5%");
    // medium risk alert description should be excluded
    expect(result).not.toContain("现金占比");
  });

  it("omits risk section when no risk alerts", () => {
    const input = makeInput({ riskAlerts: [] });
    const result = formatBriefForPush(input);
    expect(result).not.toContain("⚠ 风险提醒：");
  });

  it("omits advice section when no advice cards", () => {
    const input = makeInput({ adviceCards: [] });
    const result = formatBriefForPush(input);
    expect(result).not.toContain("💡 操作关注：");
  });

  it("omits assets line when includeTotalAssets is false", () => {
    const input = makeInput({ includeTotalAssets: false });
    const result = formatBriefForPush(input);
    expect(result).not.toContain("总资产：");
  });

  it("omits assets line when totalAssets is undefined", () => {
    const input = makeInput({ includeTotalAssets: true, totalAssets: undefined });
    const result = formatBriefForPush(input);
    expect(result).not.toContain("总资产：");
  });

  it("shows negative daily return correctly", () => {
    const input = makeInput({ dailyReturn: -3000 });
    const result = formatBriefForPush(input);
    // sign is "" for negative, value is already "-3000", so format is ¥-3000
    expect(result).toContain("今日收益：¥-3000");
  });

  it("truncates summary to 100 chars", () => {
    const longSummary = "a".repeat(200);
    const input = makeInput({ summary: longSummary });
    const result = formatBriefForPush(input);
    expect(result).toContain("a".repeat(100));
    expect(result).not.toContain("a".repeat(101));
  });

  it("limit to 3 risk alerts when not onlyHighRisk", () => {
    const alerts = Array.from({ length: 5 }, (_, i) => ({
      level: "medium" as const,
      type: "风险",
      description: `风险描述${i + 1}`,
    }));
    const input = makeInput({ riskAlerts: alerts, onlyHighRisk: false });
    const result = formatBriefForPush(input);
    expect(result).toContain("风险描述1");
    expect(result).not.toContain("风险描述4");
  });

  it("shows 2 advice cards max", () => {
    const cards = Array.from({ length: 4 }, (_, i) => ({
      adviceType: "CONTINUE_OBSERVING" as const,
      relatedMember: "张三",
      relatedAssetName: `资产${i + 1}`,
      reason: `理由${i + 1}`,
    }));
    const input = makeInput({ adviceCards: cards });
    const result = formatBriefForPush(input);
    expect(result).toContain("资产1");
    expect(result).toContain("资产2");
    expect(result).not.toContain("资产3");
  });
});

describe("formatBriefForWeCom", () => {
  it("returns markdown format", () => {
    const result = formatBriefForWeCom(makeInput());
    expect(result).toContain("## 家庭财富罗盘｜每日简报");
    expect(result).toContain("> 总资产：¥100.0万");
    expect(result).toContain("> 今日收益：<font color=\"warning\">+¥5000</font>");
    expect(result).toContain("**⚠ 风险提醒：**");
    expect(result).toContain("**💡 操作关注：**");
    expect(result).toContain("[查看完整简报](应用内查看)");
  });

  it("color-codes negative dailyReturn with 'info' color", () => {
    const input = makeInput({ dailyReturn: -2000 });
    const result = formatBriefForWeCom(input);
    // sign is "" for negative, value is already "-2000", so format is ¥-2000
    expect(result).toContain("<font color=\"info\">¥-2000</font>");
  });

  it("color-codes positive dailyReturn with 'warning' color", () => {
    const input = makeInput({ dailyReturn: 3000 });
    const result = formatBriefForWeCom(input);
    expect(result).toContain("<font color=\"warning\">+¥3000</font>");
  });

  it("includes hyperlink at end", () => {
    const result = formatBriefForWeCom(makeInput());
    expect(result).toContain("[查看完整简报]");
  });

  it("omits assets line when totalAssets not included", () => {
    const input = makeInput({ includeTotalAssets: false });
    const result = formatBriefForWeCom(input);
    expect(result).not.toContain("总资产：");
  });

  it("filters by onlyHighRisk for risk section", () => {
    const input = makeInput({ onlyHighRisk: true });
    const result = formatBriefForWeCom(input);
    // high risk alert description should be included
    expect(result).toContain("沪深300ETF权重48.5%");
    // medium risk alert description should be excluded
    expect(result).not.toContain("现金占比");
  });
});
