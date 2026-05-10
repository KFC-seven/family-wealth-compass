import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockAiProvider } from "../providers/mock-ai-provider";
import type { AiBriefInput } from "../types";

describe("MockAiProvider", () => {
  let provider: MockAiProvider;

  beforeEach(() => {
    provider = new MockAiProvider();
  });

  it("name is 'mock'", () => {
    expect(provider.name).toBe("mock");
  });

  it("isEnabled returns true", () => {
    expect(provider.isEnabled()).toBe(true);
  });

  it("healthCheck returns HEALTHY", async () => {
    const health = await provider.healthCheck!();
    expect(health.status).toBe("HEALTHY");
    expect(health.message).toBe("Mock AI 始终可用");
    expect(health.checkedAt).toBeTruthy();
  });

  it("generateStructuredBrief returns structured output", async () => {
    const input: AiBriefInput = {
      householdName: "测试家庭",
      baseCurrency: "CNY",
      date: "2026-05-11",
      totalAssets: 1000000,
      dailyReturn: 5000,
      cumulativeReturn: 80000,
      holdingReturn: 60000,
      realizedReturn: 20000,
      cashBalance: 50000,
      members: [
        {
          name: "张三",
          role: "家长",
          totalAssets: 600000,
          dailyReturn: 3000,
          cumulativeReturn: 50000,
          holdings: [
            { name: "沪深300ETF", type: "ETF", marketValue: 300000, holdingReturn: 15000, cumulativeReturn: 30000, weight: 0.5 },
          ],
          philosophy: "长期持有",
          riskPreference: "BALANCED",
        },
      ],
      riskSignals: [{ level: "high", type: "仓位集中", member: "张三", description: "权重过高", asset: "沪深300ETF" }],
      newsHighlights: [{ title: "市场平稳", impact: "neutral", importance: "medium", summary: "A股横盘" }],
      marketSummary: "市场平稳",
    };

    const output = await provider.generateStructuredBrief(input);

    expect(output.title).toContain("测试家庭");
    expect(output.title).toContain("2026-05-11");
    expect(output.summary).toBeTruthy();
    expect(output.marketOverview.length).toBeGreaterThan(0);
    expect(output.householdImpact.direction).toBe("positive");
    expect(output.memberImpacts.length).toBe(1);
    expect(output.memberImpacts[0].memberName).toBe("张三");
    expect(output.riskAlerts.length).toBe(1);
    expect(output.adviceCards.length).toBe(1);
    expect(output.adviceCards[0].relatedAssetName).toBe("沪深300ETF");
    expect(output.newsItems.length).toBe(1);
    expect(output.disclaimer).toContain("不构成确定性投资指令");
  });

  it("uses input members/holdings to generate relevant output", async () => {
    const input: AiBriefInput = {
      householdName: "测试家庭",
      baseCurrency: "CNY",
      date: "2026-05-11",
      totalAssets: 500000,
      dailyReturn: -2000,
      cumulativeReturn: 10000,
      holdingReturn: 5000,
      realizedReturn: 5000,
      cashBalance: 10000,
      members: [
        {
          name: "李四",
          role: "成员",
          totalAssets: 500000,
          dailyReturn: -2000,
          cumulativeReturn: 10000,
          holdings: [
            { name: "纳斯达克ETF", type: "ETF", marketValue: 400000, holdingReturn: -5000, cumulativeReturn: 5000, weight: 0.8 },
          ],
          philosophy: "成长投资",
          riskPreference: "AGGRESSIVE",
        },
      ],
      riskSignals: [],
      newsHighlights: [],
      marketSummary: "市场下跌",
    };

    const output = await provider.generateStructuredBrief(input);

    expect(output.memberImpacts[0].memberName).toBe("李四");
    expect(output.adviceCards[0].relatedMember).toBe("李四");
    expect(output.adviceCards[0].relatedAssetName).toBe("纳斯达克ETF");
    expect(output.memberImpacts[0].todayReturn).toBe(-2000);
  });

  it("handles empty members gracefully", async () => {
    const input: AiBriefInput = {
      householdName: "测试",
      baseCurrency: "CNY",
      date: "2026-05-11",
      totalAssets: 0,
      dailyReturn: 0,
      cumulativeReturn: 0,
      holdingReturn: 0,
      realizedReturn: 0,
      cashBalance: 0,
      members: [],
      riskSignals: [],
      newsHighlights: [],
      marketSummary: "",
    };

    const output = await provider.generateStructuredBrief(input);
    expect(output.title).toBeTruthy();
    expect(output.summary).toBeTruthy();
    expect(output.memberImpacts).toHaveLength(0);
    expect(output.riskAlerts).toHaveLength(0);
    expect(output.adviceCards).toHaveLength(0);
  });
});
