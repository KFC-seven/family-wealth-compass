import type { Household, Member, Holding, AssetAllocation, MemberAllocation, RiskAlert, HoldingRankItem } from "@/types/finance";
import type { DailyBrief as BriefViewModel, HouseholdImpactSummary, MarketOverviewItem, MemberImpactSummary, BriefNewsItem, BriefRiskAlert, AdviceCardData, WeChatPushStatus } from "@/types/brief";
import type { AppearanceSettings, WeChatPushSettings, ReturnMethodSettings } from "@/types/settings";

// Map DB enum to frontend asset type string
export function mapAssetTypeToFrontend(type: string): string {
  const map: Record<string, string> = {
    CASH: "cash",
    A_SHARE: "aShare",
    US_STOCK: "usStock",
    ETF: "etf",
    MUTUAL_FUND: "mutualFund",
    BANK_WEALTH: "bankWealth",
    GOLD_ACCUMULATION: "gold",
    BOND: "cash",
    OTHER: "cash",
  };
  return map[type] || "cash";
}

// Map frontend asset type to DB enum
export function mapFrontendToAssetType(type: string): string {
  const map: Record<string, string> = {
    cash: "CASH",
    aShare: "A_SHARE",
    usStock: "US_STOCK",
    etf: "ETF",
    mutualFund: "MUTUAL_FUND",
    bankWealth: "BANK_WEALTH",
    gold: "GOLD_ACCUMULATION",
  };
  return map[type] || "OTHER";
}

// Convert Prisma Decimal to number for frontend
export function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof (value as Record<string, unknown>).toNumber === "function") return ((value as Record<string, unknown>).toNumber as () => number)();
  return Number(value);
}

// Date to ISO string for API response
export function dateToISO(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString();
}

// ── API → ViewModel Mappers ──

/** Normalize DB asset type enum to frontend AssetType */
function toAssetType(type: string): string {
  const map: Record<string, string> = {
    A_SHARE: "aShare", US_STOCK: "usStock", ETF: "etf",
    MUTUAL_FUND: "mutualFund", BANK_WEALTH: "bankWealth",
    GOLD_ACCUMULATION: "gold", CASH: "cash",
  };
  return map[type] || "cash";
}

/** Map an API holding record to a frontend Holding ViewModel */
export function mapApiHoldingToViewModel(h: Record<string, unknown>): Holding {
  const marketValue = h.marketValue as number || 0;
  const cumulativeReturn = h.cumulativeReturn as number || 0;
  const costBasis = Math.max(0, marketValue - cumulativeReturn);
  return {
    id: h.id as string,
    memberId: h.memberId as string || "",
    accountId: h.accountId as string || "",
    assetId: h.assetId as string || "",
    assetName: (h.assetName as string) || "",
    assetType: toAssetType(h.assetType as string) as Holding["assetType"],
    currency: "CNY",
    quantity: h.quantity as number || 0,
    avgCost: h.averageCost as number || 0,
    currentPrice: h.currentPrice as number || 0,
    marketValue,
    holdingReturn: h.holdingReturn as number || 0,
    holdingReturnRate: costBasis > 0 ? ((h.holdingReturn as number || 0) / costBasis) : null,
    realizedReturn: h.realizedReturn as number || 0,
    cumulativeReturn,
    cumulativeReturnRate: costBasis > 0 ? (cumulativeReturn / costBasis) : null,
    costBasis,
    weight: 0,
    isCleared: (h.status as string) === "CLEARED",
    riskTag: (h.status as string) === "CLEARED" ? "已清仓" : undefined,
  };
}

/** Map API member data to frontend Member ViewModel */
export function mapApiMemberToViewModel(m: Record<string, unknown>): Member {
  const holdings = (m.holdings as Array<Record<string, unknown>> || []).map(mapApiHoldingToViewModel);
  const totalAssets = holdings.reduce((s, h) => s + h.marketValue, 0);
  const holdingReturn = holdings.reduce((s, h) => s + h.holdingReturn, 0);
  const realizedReturn = holdings.reduce((s, h) => s + h.realizedReturn, 0);
  const cumulativeReturn = holdings.reduce((s, h) => s + h.cumulativeReturn, 0);
  return {
    id: m.id as string,
    name: (m.displayName as string) || (m.name as string) || "",
    totalAssets,
    cashBalance: (m as { cashBalance?: number }).cashBalance || 0,
    holdingReturn,
    realizedReturn,
    cumulativeReturn,
    cumulativeReturnRate: null,
    holdings,
    accounts: (m.accounts as Array<Record<string, unknown>> || []).map((a) => ({
      id: a.id as string,
      memberId: m.id as string,
      name: a.name as string,
      platform: a.platform as string,
      cashBalance: (a as { cashBalance?: number }).cashBalance || 0,
    })),
  };
}

/** Map API household summary to frontend Household ViewModel */
export function mapApiHouseholdToViewModel(
  summary: Record<string, unknown>,
  members: Array<Record<string, unknown>>,
  holdings: Array<Record<string, unknown>>,
): Household {
  return {
    totalAssets: summary.totalAssets as number || 0,
    cashBalance: summary.cashBalance as number || 0,
    todayReturn: summary.todayReturn as number || 0,
    holdingReturn: summary.holdingReturn as number || 0,
    holdingReturnRate: (summary.holdingReturnRate as number | null) ?? null,
    realizedReturn: summary.realizedReturn as number || 0,
    cumulativeReturn: summary.cumulativeReturn as number || 0,
    cumulativeReturnRate: (summary.cumulativeReturnRate as number | null) ?? null,
    members: members.map((m) => mapApiMemberToViewModel(m)),
  };
}

/** Map API daily-brief to frontend BriefViewModel */
export function mapApiDailyBriefToViewModel(
  brief: Record<string, unknown>,
  date: string
): BriefViewModel {
  const parseJson = (field: unknown): unknown => {
    if (typeof field === "string") try { return JSON.parse(field); } catch { return {}; }
    return field || {};
  };

  const marketOverview = (parseJson(brief.marketOverview) as Array<Record<string, unknown>> || []).map(
    (m, i): MarketOverviewItem => ({
      id: `mo-${i}`,
      market: m.market as string || "",
      direction: (m.direction as MarketOverviewItem["direction"]) || "neutral",
      importance: "medium",
      summary: m.summary as string || "",
      affectedAssetTypes: [],
    })
  );

  const householdImpact = parseJson(brief.householdImpact) as Record<string, unknown> || {};
  const memberImpacts = (parseJson(brief.memberImpacts) as Array<Record<string, unknown>> || []).map(
    (mi, i): MemberImpactSummary => ({
      memberId: mi.memberId as string || `m-${i}`,
      memberName: mi.memberName as string || "",
      todayReturn: mi.todayReturn as number || 0,
      affectedHoldingCount: 0,
      mainAffectedAssets: [],
      philosophyMatch: "",
      riskAlert: "",
      adviceSummary: "",
    })
  );

  const newsItems = (parseJson(brief.newsItems) as Array<Record<string, unknown>> || []).map(
    (n, i): BriefNewsItem => ({
      id: `news-${i}`,
      title: n.title as string || "",
      source: n.source as string || "",
      date: "",
      category: "",
      relatedAssets: [],
      relatedMembers: [],
      impact: (n.impact as BriefNewsItem["impact"]) || "neutral",
      importance: (n.importance as BriefNewsItem["importance"]) || "low",
      summary: (n.summary as string) || "",
      aiInterpretation: "",
    })
  );

  const riskAlerts = (parseJson(brief.riskAlerts) as Array<Record<string, unknown>> || []).map(
    (r, i): BriefRiskAlert => ({
      id: `risk-${i}`,
      level: (r.level as BriefRiskAlert["level"]) || "low",
      type: (r.type as BriefRiskAlert["type"]) || "短期波动",
      relatedMember: r.relatedMember as string || "",
      relatedHolding: "",
      description: r.description as string || "",
      suggestWatch: "",
      triggerCondition: "",
    })
  );

  const adviceCards = (parseJson(brief.adviceCards) as Array<Record<string, unknown>> || []).map(
    (a, i): AdviceCardData => ({
      id: `adv-${i}`,
      type: (a.type as AdviceCardData["type"]) || "继续观察",
      relatedMember: a.relatedMember as string || "",
      relatedAsset: a.relatedAsset as string || "",
      reason: a.reason as string || "",
      riskLevel: (a.riskLevel as AdviceCardData["riskLevel"]) || "low",
      triggerCondition: "",
      uncertainty: "",
      philosophyMatch: "",
      observePeriod: "",
      intensity: "low",
    })
  );

  const pushStatus = parseJson(brief.pushStatus) as Record<string, unknown> || {};
  const push: WeChatPushStatus = {
    pushed: pushStatus.pushed as boolean || false,
    channel: (pushStatus.channel as WeChatPushStatus["channel"]) || "disabled",
    pushTime: pushStatus.pushTime as string || undefined,
    success: pushStatus.success as boolean || undefined,
  };

  return {
    id: brief.id as string,
    date,
    generatedAt: "",
    status: (brief.status as string) === "GENERATED" ? "generated" : "generating",
    householdImpact: {
      direction: (householdImpact.direction as HouseholdImpactSummary["direction"]) || "neutral",
      todayReturn: householdImpact.todayReturn as number || 0,
      todayReturnRate: null,
      topPositiveAsset: householdImpact.topPositiveAsset as string || "",
      topNegativeAsset: householdImpact.topNegativeAsset as string || "",
      topAffectedMember: "",
      riskKeywords: [],
    },
    marketOverview,
    memberImpacts,
    news: newsItems,
    riskAlerts,
    adviceCards,
    pushStatus: push,
  };
}

/** Map API settings to frontend Settings ViewModel */
export function mapApiSettingsToViewModel(
  settings: Record<string, unknown>
): { appearance: AppearanceSettings; pushSettings: WeChatPushSettings; returnMethod: ReturnMethodSettings } {
  const parseJson = (field: unknown): Record<string, unknown> => {
    if (typeof field === "string") try { return JSON.parse(field); } catch { return {}; }
    return (field as Record<string, unknown>) || {};
  };

  const appearance = parseJson(settings.appearance) as Record<string, unknown>;
  const pushSettings = parseJson(settings.pushSettings) as Record<string, unknown>;
  const returnMethod = parseJson(settings.returnMethod) as Record<string, unknown>;

  return {
    appearance: {
      theme: (appearance.theme as AppearanceSettings["theme"]) || "system",
      returnColorScheme: (appearance.returnColorScheme as AppearanceSettings["returnColorScheme"]) || "cn_red_up",
      defaultTimeRange: (appearance.defaultTimeRange as string) || "近30日",
      defaultCurrency: (appearance.defaultCurrency as string) || "CNY",
      decimalPlaces: (appearance.decimalPlaces as number) || 2,
      privacyMode: (appearance.privacyMode as boolean) || false,
    },
    pushSettings: {
      enabled: (pushSettings.enabled as boolean) || false,
      pushTime: (pushSettings.pushTime as string) || "07:30",
      channel: (pushSettings.channel as WeChatPushSettings["channel"]) || "disabled",
      webhookUrl: "",
      serverChanKey: "",
      includeTotalAssets: false,
      includeMemberDetail: false,
      includeAIAdvice: false,
      onlyHighRisk: false,
    },
    returnMethod: {
      costMethod: (returnMethod.costMethod as string) || "平均成本法",
      holdingReturnDef: (returnMethod.holdingReturnDef as string) || "",
      realizedReturnDef: (returnMethod.realizedReturnDef as string) || "",
      cumulativeReturnDef: (returnMethod.cumulativeReturnDef as string) || "",
      periodReturnDef: "",
      cashFlowHandling: "",
      futureOptions: [],
    },
  };
}
