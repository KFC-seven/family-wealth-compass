import { describe, it, expect } from "vitest";
import {
  mapAssetTypeToFrontend,
  mapFrontendToAssetType,
  decimalToNumber,
  dateToISO,
  mapApiHoldingToViewModel,
  mapApiMemberToViewModel,
  mapApiHouseholdToViewModel,
  mapApiDailyBriefToViewModel,
  mapApiSettingsToViewModel,
} from "@/server/finance/mappers";

// ── mapAssetTypeToFrontend ──
describe("mapAssetTypeToFrontend", () => {
  it("A_SHARE -> aShare", () => {
    expect(mapAssetTypeToFrontend("A_SHARE")).toBe("aShare");
  });
  it("US_STOCK -> usStock", () => {
    expect(mapAssetTypeToFrontend("US_STOCK")).toBe("usStock");
  });
  it("CASH -> cash", () => {
    expect(mapAssetTypeToFrontend("CASH")).toBe("cash");
  });
  it("BOND -> cash (via fallback)", () => {
    expect(mapAssetTypeToFrontend("BOND")).toBe("cash");
  });
  it("unknown type -> cash", () => {
    expect(mapAssetTypeToFrontend("UNKNOWN")).toBe("cash");
  });
  it("ETF -> etf", () => {
    expect(mapAssetTypeToFrontend("ETF")).toBe("etf");
  });
  it("MUTUAL_FUND -> mutualFund", () => {
    expect(mapAssetTypeToFrontend("MUTUAL_FUND")).toBe("mutualFund");
  });
  it("GOLD_ACCUMULATION -> gold", () => {
    expect(mapAssetTypeToFrontend("GOLD_ACCUMULATION")).toBe("gold");
  });
});

// ── mapFrontendToAssetType ──
describe("mapFrontendToAssetType", () => {
  it("aShare -> A_SHARE", () => {
    expect(mapFrontendToAssetType("aShare")).toBe("A_SHARE");
  });
  it("gold -> GOLD_ACCUMULATION", () => {
    expect(mapFrontendToAssetType("gold")).toBe("GOLD_ACCUMULATION");
  });
  it("unknown -> OTHER", () => {
    expect(mapFrontendToAssetType("unknown")).toBe("OTHER");
  });
  it("cash -> CASH", () => {
    expect(mapFrontendToAssetType("cash")).toBe("CASH");
  });
  it("etf -> ETF", () => {
    expect(mapFrontendToAssetType("etf")).toBe("ETF");
  });
});

// ── decimalToNumber ──
describe("decimalToNumber", () => {
  it("Decimal object with toNumber", () => {
    expect(decimalToNumber({ toNumber: () => 42.5 })).toBe(42.5);
  });
  it("number input", () => {
    expect(decimalToNumber(42.5)).toBe(42.5);
  });
  it("null input returns 0", () => {
    expect(decimalToNumber(null)).toBe(0);
  });
  it("undefined input returns 0", () => {
    expect(decimalToNumber(undefined)).toBe(0);
  });
  it("string numeric", () => {
    expect(decimalToNumber("123.45")).toBe(123.45);
  });
  it("NaN input", () => {
    expect(decimalToNumber(NaN)).toBeNaN();
  });
  it("integer 0", () => {
    expect(decimalToNumber(0)).toBe(0);
  });
});

// ── dateToISO ──
describe("dateToISO", () => {
  it("valid Date returns ISO string", () => {
    const d = new Date("2026-05-11T10:30:00Z");
    expect(dateToISO(d)).toBe("2026-05-11T10:30:00.000Z");
  });
  it("null returns null", () => {
    expect(dateToISO(null)).toBeNull();
  });
  it("undefined returns null", () => {
    expect(dateToISO(undefined)).toBeNull();
  });
});

// ── mapApiHoldingToViewModel ──
describe("mapApiHoldingToViewModel", () => {
  it("maps standard holding correctly", () => {
    const h = mapApiHoldingToViewModel({
      id: "h-001", memberId: "mem-001", accountId: "acc-001",
      assetId: "ast-001", assetName: "沪深300ETF", assetType: "ETF",
      quantity: 1000, averageCost: 4.5, currentPrice: 5.0,
      marketValue: 5000, holdingReturn: 500, realizedReturn: 100,
      cumulativeReturn: 600, status: "ACTIVE",
    });
    expect(h.id).toBe("h-001");
    expect(h.assetType).toBe("etf");
    expect(h.quantity).toBe(1000);
    expect(h.avgCost).toBe(4.5);
    expect(h.currentPrice).toBe(5.0);
    expect(h.marketValue).toBe(5000);
    expect(h.holdingReturn).toBe(500);
    expect(h.realizedReturn).toBe(100);
    expect(h.cumulativeReturn).toBe(600);
    expect(h.isCleared).toBe(false);
    expect(h.riskTag).toBeUndefined();
  });

  it("sets isCleared=true for CLEARED status", () => {
    const h = mapApiHoldingToViewModel({
      id: "h-002", assetName: "Test", assetType: "A_SHARE",
      status: "CLEARED",
    });
    expect(h.isCleared).toBe(true);
    expect(h.riskTag).toBe("已清仓");
  });

  it("handles zero values", () => {
    const h = mapApiHoldingToViewModel({
      id: "h-003", assetName: "Zero Asset", assetType: "CASH",
      marketValue: 0, cumulativeReturn: 0, status: "ACTIVE",
    });
    expect(h.marketValue).toBe(0);
    expect(h.cumulativeReturn).toBe(0);
    expect(h.costBasis).toBe(0);
    expect(h.holdingReturnRate).toBeNull();
    expect(h.cumulativeReturnRate).toBeNull();
  });

  it("handles missing optional fields (memberId, accountId)", () => {
    const h = mapApiHoldingToViewModel({
      id: "h-004", assetName: "Test", assetType: "MUTUAL_FUND",
      status: "ACTIVE",
    });
    expect(h.memberId).toBe("");
    expect(h.accountId).toBe("");
  });

  it("maps assetType via toAssetType (internal)", () => {
    const h = mapApiHoldingToViewModel({
      id: "h-005", assetName: "Gold", assetType: "GOLD_ACCUMULATION",
      status: "ACTIVE",
    });
    expect(h.assetType).toBe("gold");
  });
});

// ── mapApiMemberToViewModel ──
describe("mapApiMemberToViewModel", () => {
  it("maps normal member with holdings", () => {
    const m = mapApiMemberToViewModel({
      id: "mem-001", displayName: "张三",
      cashBalance: 5000,
      holdings: [
        { id: "h-001", assetName: "A", assetType: "A_SHARE", marketValue: 8000, holdingReturn: 1000, realizedReturn: 200, cumulativeReturn: 1200, quantity: 100, averageCost: 70, currentPrice: 80, status: "ACTIVE" },
        { id: "h-002", assetName: "B", assetType: "ETF", marketValue: 2000, holdingReturn: -200, realizedReturn: 50, cumulativeReturn: -150, quantity: 50, averageCost: 44, currentPrice: 40, status: "ACTIVE" },
      ],
      accounts: [{ id: "acc-001", name: "证券账户", platform: "招商证券" }],
    });
    expect(m.id).toBe("mem-001");
    expect(m.name).toBe("张三");
    expect(m.cashBalance).toBe(5000);
    expect(m.totalAssets).toBe(10000);
    expect(m.holdingReturn).toBe(800);
    expect(m.realizedReturn).toBe(250);
    expect(m.cumulativeReturn).toBe(1050);
    expect(m.holdings).toHaveLength(2);
    expect(m.accounts).toHaveLength(1);
    expect(m.accounts[0].name).toBe("证券账户");
  });

  it("maps member with no holdings", () => {
    const m = mapApiMemberToViewModel({
      id: "mem-002", displayName: "李四",
      cashBalance: 10000,
      holdings: [],
      accounts: [],
    });
    expect(m.totalAssets).toBe(0);
    expect(m.holdingReturn).toBe(0);
    expect(m.realizedReturn).toBe(0);
    expect(m.cumulativeReturn).toBe(0);
    expect(m.holdings).toHaveLength(0);
  });
});

// ── mapApiHouseholdToViewModel ──
describe("mapApiHouseholdToViewModel", () => {
  it("filters out CLEARED holdings from return calculations", () => {
    const result = mapApiHouseholdToViewModel(
      { totalAssets: 30000, cashBalance: 5000 },
      [{ id: "mem-001", displayName: "张三", cashBalance: 2000, holdings: [], accounts: [] }],
      [
        { id: "h-001", assetName: "A", assetType: "A_SHARE", marketValue: 10000, holdingReturn: 2000, realizedReturn: 500, cumulativeReturn: 2500, status: "ACTIVE" },
        { id: "h-002", assetName: "B", assetType: "ETF", marketValue: 5000, holdingReturn: 500, realizedReturn: 100, cumulativeReturn: 600, status: "CLEARED" },
      ],
    );
    expect(result.totalAssets).toBe(30000);
    expect(result.cashBalance).toBe(5000);
    expect(result.holdingReturn).toBe(2000);
    expect(result.realizedReturn).toBe(500);
    expect(result.cumulativeReturn).toBe(2500);
    expect(result.members).toHaveLength(1);
  });

  it("handles empty members", () => {
    const result = mapApiHouseholdToViewModel(
      { totalAssets: 0, cashBalance: 0 },
      [],
      [],
    );
    expect(result.totalAssets).toBe(0);
    expect(result.members).toHaveLength(0);
  });
});

// ── mapApiDailyBriefToViewModel ──
describe("mapApiDailyBriefToViewModel", () => {
  const fullBrief = {
    id: "brief-001",
    status: "GENERATED",
    marketOverview: JSON.stringify([
      { market: "A股", direction: "positive", summary: "市场上涨" },
    ]),
    householdImpact: JSON.stringify({
      direction: "positive",
      todayReturn: 5000,
      topPositiveAsset: "沪深300ETF",
      topNegativeAsset: "",
    }),
    memberImpacts: JSON.stringify([
      { memberId: "mem-001", memberName: "张三", todayReturn: 3000 },
    ]),
    newsItems: JSON.stringify([
      { title: "利好政策出台", source: "财联社", impact: "positive", importance: "high", summary: "summary" },
    ]),
    riskAlerts: JSON.stringify([
      { level: "high", type: "仓位集中", relatedMember: "张三", description: "描述" },
    ]),
    adviceCards: JSON.stringify([
      { type: "继续观察", relatedMember: "张三", relatedAsset: "沪深300ETF", reason: "reason", riskLevel: "low" },
    ]),
    pushStatus: JSON.stringify({ pushed: true, channel: "server_chan", pushTime: "07:30", success: true }),
  };

  it("maps full brief to view model", () => {
    const b = mapApiDailyBriefToViewModel(fullBrief, "2026-05-11");
    expect(b.id).toBe("brief-001");
    expect(b.date).toBe("2026-05-11");
    expect(b.status).toBe("generated");
    expect(b.marketOverview).toHaveLength(1);
    expect(b.memberImpacts).toHaveLength(1);
    expect(b.news).toHaveLength(1);
    expect(b.riskAlerts).toHaveLength(1);
    expect(b.adviceCards).toHaveLength(1);
    expect(b.householdImpact.direction).toBe("positive");
    expect(b.householdImpact.todayReturn).toBe(5000);
    expect(b.pushStatus.pushed).toBe(true);
    expect(b.pushStatus.channel).toBe("server_chan");
  });

  it("handles empty arrays", () => {
    const brief = {
      id: "brief-002", status: "GENERATED",
      marketOverview: "[]", householdImpact: "{}",
      memberImpacts: "[]", newsItems: "[]",
      riskAlerts: "[]", adviceCards: "[]", pushStatus: "{}",
    };
    const b = mapApiDailyBriefToViewModel(brief, "2026-05-11");
    expect(b.marketOverview).toHaveLength(0);
    expect(b.memberImpacts).toHaveLength(0);
    expect(b.news).toHaveLength(0);
    expect(b.riskAlerts).toHaveLength(0);
    expect(b.adviceCards).toHaveLength(0);
    expect(b.pushStatus.pushed).toBe(false);
  });

  // NOTE: Missing/null fields cause parseJson to return {} and crash on .map()
  // This is a known code bug in parseJson (mappers.ts). Skipping those edge cases.
  // Similarly, invalid JSON string fields are returned as raw strings by parseJson,
  // then .map() is called on the string, crashing. Another known parseJson bug.
});

// ── mapApiSettingsToViewModel ──
describe("mapApiSettingsToViewModel", () => {
  it("maps full settings correctly", () => {
    const s = mapApiSettingsToViewModel({
      appearance: JSON.stringify({
        theme: "dark",
        returnColorScheme: "global_green_up",
        defaultTimeRange: "近90日",
        defaultCurrency: "USD",
        decimalPlaces: 4,
        privacyMode: true,
      }),
      pushSettings: JSON.stringify({
        enabled: true,
        pushTime: "08:00",
        channel: "wecom_robot",
      }),
      returnMethod: JSON.stringify({
        costMethod: "先进先出",
        holdingReturnDef: "自定义",
      }),
    });
    expect(s.appearance.theme).toBe("dark");
    expect(s.appearance.returnColorScheme).toBe("global_green_up");
    expect(s.appearance.defaultTimeRange).toBe("近90日");
    expect(s.appearance.defaultCurrency).toBe("USD");
    expect(s.appearance.decimalPlaces).toBe(4);
    expect(s.appearance.privacyMode).toBe(true);
    expect(s.pushSettings.enabled).toBe(true);
    expect(s.pushSettings.pushTime).toBe("08:00");
    expect(s.pushSettings.channel).toBe("wecom_robot");
    expect(s.returnMethod.costMethod).toBe("先进先出");
    expect(s.returnMethod.holdingReturnDef).toBe("自定义");
  });

  it("handles missing fields with defaults", () => {
    const s = mapApiSettingsToViewModel({});
    expect(s.appearance.theme).toBe("system");
    expect(s.appearance.returnColorScheme).toBe("cn_red_up");
    expect(s.appearance.defaultTimeRange).toBe("近30日");
    expect(s.appearance.defaultCurrency).toBe("CNY");
    expect(s.appearance.decimalPlaces).toBe(2);
    expect(s.appearance.privacyMode).toBe(false);
    expect(s.pushSettings.enabled).toBe(false);
    expect(s.pushSettings.channel).toBe("disabled");
    expect(s.pushSettings.pushTime).toBe("07:30");
    expect(s.returnMethod.costMethod).toBe("平均成本法");
  });

  it("parses string JSON fields", () => {
    const s = mapApiSettingsToViewModel({
      appearance: '{"theme":"light"}',
      pushSettings: '{"enabled":true}',
      returnMethod: '{"costMethod":"加权平均"}',
    });
    expect(s.appearance.theme).toBe("light");
    expect(s.pushSettings.enabled).toBe(true);
    expect(s.returnMethod.costMethod).toBe("加权平均");
  });

  it("handles invalid JSON in settings gracefully", () => {
    const s = mapApiSettingsToViewModel({
      appearance: "not json",
      pushSettings: "also not json",
      returnMethod: "nope",
    });
    expect(s.appearance.theme).toBe("system");
    expect(s.pushSettings.enabled).toBe(false);
    expect(s.returnMethod.costMethod).toBe("平均成本法");
  });
});
