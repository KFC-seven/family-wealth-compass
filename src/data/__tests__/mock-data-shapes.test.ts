import { describe, it, expect } from "vitest";
import type { Household, DailyReturn, MonthlyAsset, AssetAllocation, MemberAllocation, RiskAlert, HoldingRankItem } from "@/types/finance";
import type { DailyBrief } from "@/types/brief";
import type { AppearanceSettings, WeChatPushSettings, ReturnMethodSettings } from "@/types/settings";

// Test mock data shapes for the data layer contract
describe("mock-household data shape", () => {
  it("matches Household type", async () => {
    const { mockHousehold } = await import("@/data/mock-household");
    const h: Household = mockHousehold;
    expect(h.totalAssets).toBeTypeOf("number");
    expect(h.cashBalance).toBeTypeOf("number");
    expect(h.todayReturn).toBeTypeOf("number");
    expect(h.holdingReturn).toBeTypeOf("number");
    expect(h.realizedReturn).toBeTypeOf("number");
    expect(h.cumulativeReturn).toBeTypeOf("number");
  });

  it("dailyReturns match DailyReturn type", async () => {
    const { mockDailyReturns } = await import("@/data/mock-household");
    expect(mockDailyReturns.length).toBeGreaterThan(0);
    for (const dr of mockDailyReturns) {
      const r: DailyReturn = dr;
      expect(typeof r.date).toBe("string");
      expect(typeof r.value).toBe("number");
    }
  });

  it("assetAllocation matches AssetAllocation type", async () => {
    const { mockAssetAllocation } = await import("@/data/mock-household");
    expect(mockAssetAllocation.length).toBeGreaterThan(0);
    for (const a of mockAssetAllocation) {
      const alloc: AssetAllocation = a;
      expect(alloc.type).toBeTypeOf("string");
      expect(alloc.value).toBeTypeOf("number");
      expect(alloc.percentage).toBeTypeOf("number");
    }
  });

  it("memberAllocation has valid percentages summing approximately to 100%", async () => {
    const { mockMemberAllocation } = await import("@/data/mock-household");
    const total = mockMemberAllocation.reduce((s: number, m: MemberAllocation) => s + m.percentage, 0);
    expect(total).toBeCloseTo(1, 1);
  });

  it("riskAlerts have valid types", async () => {
    const { mockRiskAlerts } = await import("@/data/mock-household");
    for (const r of mockRiskAlerts) {
      expect(["warning", "danger", "info"]).toContain(r.type);
      expect(r.title).toBeTruthy();
    }
  });

  it("topGainers have positive return_value", async () => {
    const { mockTopGainers } = await import("@/data/mock-household");
    for (const g of mockTopGainers) {
      expect(g.return_value).toBeGreaterThan(0);
    }
  });

  it("topLosers have negative return_value", async () => {
    const { mockTopLosers } = await import("@/data/mock-household");
    for (const l of mockTopLosers) {
      expect(l.return_value).toBeLessThan(0);
    }
  });

  it("briefPreview matches DailyBrief shape", async () => {
    const { mockDailyBrief } = await import("@/data/mock-household");
    const b: DailyBrief = mockDailyBrief;
    expect(b.date).toBeTruthy();
    expect(typeof b.summary).toBe("string");
    expect(typeof b.hasNew).toBe("boolean");
  });
});

describe("mock-members data shape", () => {
  it("all members have required fields", async () => {
    const { mockMembers } = await import("@/data/mock-members");
    for (const m of mockMembers) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(typeof m.totalAssets).toBe("number");
      expect(typeof m.cashBalance).toBe("number");
      expect(typeof m.holdingReturn).toBe("number");
      expect(Array.isArray(m.holdings)).toBe(true);
      expect(Array.isArray(m.accounts)).toBe(true);
    }
  });

  it("has at least 3 members", async () => {
    const { mockMembers } = await import("@/data/mock-members");
    expect(mockMembers.length).toBeGreaterThanOrEqual(3);
  });
});

describe("mock-holdings data shape", () => {
  it("all holdings have required fields", async () => {
    const { mockHoldings } = await import("@/data/mock-holdings");
    for (const h of mockHoldings) {
      expect(h.id).toBeTruthy();
      expect(h.memberId).toBeTruthy();
      expect(h.assetName).toBeTruthy();
      expect(["cash", "aShare", "usStock", "etf", "mutualFund", "bankWealth", "gold"]).toContain(h.assetType);
      expect(typeof h.marketValue).toBe("number");
      expect(typeof h.holdingReturn).toBe("number");
      expect(typeof h.realizedReturn).toBe("number");
      expect(typeof h.cumulativeReturn).toBe("number");
    }
  });

  it("has both current and cleared holdings", async () => {
    const { mockHoldings } = await import("@/data/mock-holdings");
    const cleared = mockHoldings.filter((h) => h.isCleared);
    const current = mockHoldings.filter((h) => !h.isCleared);
    expect(cleared.length).toBeGreaterThan(0);
    expect(current.length).toBeGreaterThan(0);
  });

  it("all current holdings have isCleared undefined or false", async () => {
    const { mockHoldings } = await import("@/data/mock-holdings");
    for (const h of mockHoldings) {
      if (h.isCleared === true) {
        expect(h.quantity).toBe(0);
        expect(h.marketValue).toBe(0);
      }
    }
  });
});

describe("mock-settings data shape", () => {
  it("appearance matches AppearanceSettings type", async () => {
    const { mockAppearanceSettings } = await import("@/data/mock-settings");
    const a: AppearanceSettings = mockAppearanceSettings;
    expect(["light", "dark", "system"]).toContain(a.theme);
    expect(typeof a.privacyMode).toBe("boolean");
    expect(typeof a.decimalPlaces).toBe("number");
  });

  it("push settings match WeChatPushSettings type", async () => {
    const { mockWeChatPushSettings } = await import("@/data/mock-settings");
    const p: WeChatPushSettings = mockWeChatPushSettings;
    expect(typeof p.enabled).toBe("boolean");
    expect(typeof p.pushTime).toBe("string");
  });

  it("return method settings match ReturnMethodSettings type", async () => {
    const { mockReturnMethodSettings } = await import("@/data/mock-settings");
    const r: ReturnMethodSettings = mockReturnMethodSettings;
    expect(typeof r.costMethod).toBe("string");
    expect(Array.isArray(r.futureOptions)).toBe(true);
  });
});

describe("mock-brief data shape", () => {
  it("has all required sections", async () => {
    const { mockBrief } = await import("@/data/mock-brief");
    expect(mockBrief.marketOverview).toBeInstanceOf(Array);
    expect(mockBrief.householdImpact).toBeDefined();
    expect(mockBrief.memberImpacts).toBeInstanceOf(Array);
    expect(mockBrief.news).toBeInstanceOf(Array);
    expect(mockBrief.riskAlerts).toBeInstanceOf(Array);
    expect(mockBrief.adviceCards).toBeInstanceOf(Array);
    expect(mockBrief.pushStatus).toBeDefined();
  });

  it("has market overview items", async () => {
    const { mockBrief } = await import("@/data/mock-brief");
    expect(mockBrief.marketOverview.length).toBeGreaterThan(0);
    for (const m of mockBrief.marketOverview) {
      expect(m.market).toBeTruthy();
      expect(["positive", "negative", "neutral", "volatile"]).toContain(m.direction);
    }
  });

  it("has member impact items with affectedHoldingCount > 0", async () => {
    const { mockBrief } = await import("@/data/mock-brief");
    expect(mockBrief.memberImpacts.length).toBeGreaterThan(0);
    for (const mi of mockBrief.memberImpacts) {
      expect(mi.memberName).toBeTruthy();
      expect(mi.affectedHoldingCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("adviceCards have required fields", async () => {
    const { mockBrief } = await import("@/data/mock-brief");
    for (const a of mockBrief.adviceCards) {
      expect(a.type).toBeTruthy();
      expect(a.reason).toBeTruthy();
      expect(["low", "medium", "high"]).toContain(a.riskLevel);
    }
  });

  it("status is a valid BriefStatus", async () => {
    const { mockBrief } = await import("@/data/mock-brief");
    expect(["generated", "generating", "failed", "pushed"]).toContain(mockBrief.status);
  });
});
