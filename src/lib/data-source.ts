/**
 * Data source abstraction layer.
 *
 * - NEXT_PUBLIC_USE_API=false → return mock data
 * - NEXT_PUBLIC_USE_API=true  → fetch from API, fallback to mock on failure
 *
 * Every function returns ViewModel types from @/types/ so UI components
 * do not need to change regardless of data source.
 */

import { USE_API_DATA } from "@/lib/api/api-client";
import { api } from "@/lib/api/api-client";
import {
  mapApiHoldingToViewModel,
  mapApiMemberToViewModel,
  mapApiHouseholdToViewModel,
  mapApiDailyBriefToViewModel,
  mapApiSettingsToViewModel,
} from "@/server/finance/mappers";

// ── Mock imports ──
import {
  mockHousehold,
  mockDailyReturns,
  mockMonthlyAssets,
  mockAssetAllocation,
  mockMemberAllocation,
  mockRiskAlerts,
  mockDailyBrief as mockBriefPreview,
  mockTopGainers,
  mockTopLosers,
} from "@/data/mock-household";
import { mockMembers } from "@/data/mock-members";
import {
  mockHoldings,
} from "@/data/mock-holdings";
import { mockBrief } from "@/data/mock-brief";
import {
  mockAppearanceSettings as mockAppearance,
  mockWeChatPushSettings as mockPush,
  mockReturnMethodSettings as mockReturnMethod,
} from "@/data/mock-settings";

import type {
  Household, Member, Holding, DailyReturn, MonthlyAsset,
  AssetAllocation, MemberAllocation, RiskAlert, HoldingRankItem,
} from "@/types/finance";
import type { DailyBrief as BriefViewModel } from "@/types/brief";
import type { AppearanceSettings, WeChatPushSettings, ReturnMethodSettings } from "@/types/settings";

// ── Helpers ──

function logFallback(name: string) {
  if (typeof console !== "undefined") {
    console.warn(`[DataSource] ${name} API fallback → mock`);
  }
}

// ── Household (Dashboard) ──

export async function getHousehold(): Promise<{
  household: Household;
  dailyReturns: DailyReturn[];
  monthlyAssets: MonthlyAsset[];
  assetAllocation: AssetAllocation[];
  memberAllocation: MemberAllocation[];
  riskAlerts: RiskAlert[];
  topGainers: HoldingRankItem[];
  topLosers: HoldingRankItem[];
  briefPreview: { date: string; summary: string; hasNew: boolean };
}> {
  if (!USE_API_DATA) {
    return {
      household: mockHousehold,
      dailyReturns: mockDailyReturns,
      monthlyAssets: mockMonthlyAssets,
      assetAllocation: mockAssetAllocation,
      memberAllocation: mockMemberAllocation,
      riskAlerts: mockRiskAlerts,
      topGainers: mockTopGainers,
      topLosers: mockTopLosers,
      briefPreview: mockBriefPreview,
    };
  }

  try {
    const [summary, members, holdingsData, briefData] = await Promise.all([
      api.householdSummary(),
      api.members(),
      api.holdings(),
      api.dailyBrief().catch(() => null),
    ]);

    const household = mapApiHouseholdToViewModel(
      summary, members, holdingsData
    );

    const filteredHoldings = (holdingsData as Array<Record<string, unknown>>).filter(
      (h) => (h.status as string) !== "CLEARED"
    );

    const totalAssets = summary.totalAssets;
    const sortedByReturn = [...filteredHoldings].sort((a, b) => {
      const aRet = (a.cumulativeReturn as number) || 0;
      const bRet = (b.cumulativeReturn as number) || 0;
      return bRet - aRet;
    });
    const topGainers = sortedByReturn
      .filter((h) => ((h.cumulativeReturn as number) || 0) > 0)
      .slice(0, 5)
      .map((h) => mapHoldingToRankItem(h));
    const topLosers = sortedByReturn
      .filter((h) => ((h.cumulativeReturn as number) || 0) < 0)
      .slice(0, 5)
      .map((h) => mapHoldingToRankItem(h));

    // Build asset allocation from holdings data
    const assetAllocation = buildAssetAllocation(filteredHoldings, totalAssets);
    const memberAllocation = buildMemberAllocation(members, filteredHoldings, totalAssets);

    // For now, dailyReturns / monthlyAssets / riskAlerts still come from mock
    return {
      household,
      dailyReturns: mockDailyReturns,
      monthlyAssets: mockMonthlyAssets,
      assetAllocation,
      memberAllocation,
      riskAlerts: mockRiskAlerts,
      topGainers,
      topLosers,
      briefPreview: briefData
        ? { date: (briefData.date as string)?.substring(0, 10) || "", summary: (briefData as Record<string, unknown>).summary as string || "", hasNew: true }
        : mockBriefPreview,
    };
  } catch {
    logFallback("getHousehold");
    return {
      household: mockHousehold,
      dailyReturns: mockDailyReturns,
      monthlyAssets: mockMonthlyAssets,
      assetAllocation: mockAssetAllocation,
      memberAllocation: mockMemberAllocation,
      riskAlerts: mockRiskAlerts,
      topGainers: mockTopGainers,
      topLosers: mockTopLosers,
      briefPreview: mockBriefPreview,
    };
  }
}

function buildAssetAllocation(
  holdings: Array<Record<string, unknown>>,
  totalAssets: number
): AssetAllocation[] {
  const grouped: Record<string, number> = {};
  for (const h of holdings) {
    const type = normalizeAssetType((h.assetType as string) || "");
    grouped[type] = (grouped[type] || 0) + ((h.marketValue as number) || 0);
  }
  return Object.entries(grouped).map(([type, value]) => ({
    type: type as AssetAllocation["type"],
    value,
    percentage: totalAssets > 0 ? value / totalAssets : 0,
  }));
}

function buildMemberAllocation(
  members: Array<Record<string, unknown>>,
  holdings: Array<Record<string, unknown>>,
  totalAssets: number
): MemberAllocation[] {
  const grouped: Record<string, { name: string; value: number }> = {};
  for (const m of members) {
    grouped[m.id as string] = { name: (m.name as string) || "", value: 0 };
  }
  for (const h of holdings) {
    const memberId = h.memberId as string;
    if (grouped[memberId]) {
      grouped[memberId].value += (h.marketValue as number) || 0;
    }
  }
  return Object.entries(grouped).map(([memberId, info]) => ({
    memberId,
    memberName: info.name,
    value: info.value,
    percentage: totalAssets > 0 ? info.value / totalAssets : 0,
  }));
}

function mapHoldingToRankItem(h: Record<string, unknown>): HoldingRankItem {
  const assetType = (h.assetType as string) || "";
  const marketValue = (h.marketValue as number) || 0;
  const cumulativeReturn = (h.cumulativeReturn as number) || 0;
  const cost = Math.max(0, marketValue - cumulativeReturn);
  return {
    holdingId: (h.id as string) || "",
    assetName: (h.assetName as string) || "",
    assetType: normalizeAssetType(assetType) as HoldingRankItem["assetType"],
    memberName: (h.memberName as string) || "",
    return_value: cumulativeReturn,
    returnRate: cost > 0 ? cumulativeReturn / cost : null,
  };
}

function normalizeAssetType(type: string): string {
  const map: Record<string, string> = {
    A_SHARE: "aShare", US_STOCK: "usStock", ETF: "etf",
    MUTUAL_FUND: "mutualFund", BANK_WEALTH: "bankWealth",
    GOLD_ACCUMULATION: "gold", CASH: "cash",
  };
  return map[type] || "cash";
}

// ── Members ──

export async function getMembersData(): Promise<Member[]> {
  if (!USE_API_DATA) return mockMembers;

  try {
    const members = await api.members();
    const holdingsData = await api.holdings();
    const enriched = await Promise.all(
      members.map(async (m: { id: string }) => {
        try {
          return await api.memberSummary(m.id);
        } catch {
          return null;
        }
      })
    );

    return (members as Array<Record<string, unknown>>).map((m, i) => {
      const summary = enriched[i] || { totalAssets: 0, cashBalance: 0, holdingReturn: 0, realizedReturn: 0, cumulativeReturn: 0 };
      const memberId = m.id as string;
      const memberHoldings = (holdingsData as Array<Record<string, unknown>>).filter(
        (h) => h.memberId === memberId && (h.status as string) !== "CLEARED"
      );
      return {
        id: memberId,
        name: (m.displayName as string) || (m.name as string) || "",
        totalAssets: summary.totalAssets || memberHoldings.reduce(
          (s, h) => s + ((h.marketValue as number) || 0), 0
        ),
        cashBalance: summary.cashBalance || 0,
        holdingReturn: summary.holdingReturn || 0,
        realizedReturn: summary.realizedReturn || 0,
        cumulativeReturn: summary.cumulativeReturn || 0,
        cumulativeReturnRate: null,
        holdings: memberHoldings.map(mapApiHoldingToViewModel),
        accounts: [],
      };
    });
  } catch {
    logFallback("getMembersData");
    return mockMembers;
  }
}

export async function getMemberById(memberId: string): Promise<{
  member: Member;
  currentHoldings: Holding[];
  clearedHoldings: Holding[];
}> {
  if (!USE_API_DATA) {
    const memberMock = mockMembers.find((m) => m.id === memberId);
    if (!memberMock) throw new Error(`Member not found: ${memberId}`);
    const allHoldings = mockHoldings.filter((h) => h.memberId === memberId);
    return {
      member: memberMock,
      currentHoldings: allHoldings.filter((h) => !h.isCleared),
      clearedHoldings: allHoldings.filter((h) => h.isCleared),
    };
  }

  try {
    const detail = await api.member(memberId);
    const member = mapApiMemberToViewModel(detail);
    const allHoldings = (detail.holdings || []).map(mapApiHoldingToViewModel);
    return {
      member,
      currentHoldings: allHoldings.filter((h) => h.isCleared !== true),
      clearedHoldings: allHoldings.filter((h) => h.isCleared === true),
    };
  } catch {
    logFallback("getMemberById");
    const memberMock = mockMembers.find((m) => m.id === memberId);
    if (!memberMock) throw new Error(`Member not found: ${memberId}`);
    const allHoldings = mockHoldings.filter((h) => h.memberId === memberId);
    return {
      member: memberMock,
      currentHoldings: allHoldings.filter((h) => !h.isCleared),
      clearedHoldings: allHoldings.filter((h) => h.isCleared),
    };
  }
}

export async function getMemberSummaryData(memberId: string) {
  if (!USE_API_DATA) {
    const member = mockMembers.find((m) => m.id === memberId);
    if (!member) return null;
    return {
      memberId: member.id,
      name: member.name,
      totalAssets: member.totalAssets,
      cashBalance: member.cashBalance,
      holdingReturn: member.holdingReturn,
      realizedReturn: member.realizedReturn,
      cumulativeReturn: member.cumulativeReturn,
      holdingCount: mockHoldings.filter((h) => h.memberId === memberId && !h.isCleared).length,
    };
  }

  try {
    return await api.memberSummary(memberId);
  } catch {
    logFallback("getMemberSummaryData");
    const member = mockMembers.find((m) => m.id === memberId);
    if (!member) return null;
    return {
      memberId: member.id,
      name: member.name,
      totalAssets: member.totalAssets,
      cashBalance: member.cashBalance,
      holdingReturn: member.holdingReturn,
      realizedReturn: member.realizedReturn,
      cumulativeReturn: member.cumulativeReturn,
      holdingCount: mockHoldings.filter((h) => h.memberId === memberId && !h.isCleared).length,
    };
  }
}

// ── Holdings ──

export async function getHoldingsData(): Promise<{
  members: Member[];
  currentHoldings: Holding[];
  clearedHoldings: Holding[];
}> {
  if (!USE_API_DATA) {
    return {
      members: mockMembers,
      currentHoldings: mockHoldings.filter((h) => !h.isCleared),
      clearedHoldings: mockHoldings.filter((h) => h.isCleared),
    };
  }

  try {
    const [members, holdingsData] = await Promise.all([
      api.members(),
      api.holdings(),
    ]);

    return {
      members: (members as Array<Record<string, unknown>>).map((m) => ({
        id: m.id as string,
        name: (m.displayName as string) || (m.name as string) || "",
        totalAssets: 0, cashBalance: 0, holdingReturn: 0,
        realizedReturn: 0, cumulativeReturn: 0, cumulativeReturnRate: null,
        holdings: [], accounts: [],
      })),
      currentHoldings: (holdingsData as Array<Record<string, unknown>>)
        .filter((h) => (h.status as string) !== "CLEARED")
        .map((h) => ({
          ...mapApiHoldingToViewModel(h),
          memberName: (h.memberName as string) || "",
        })),
      clearedHoldings: (holdingsData as Array<Record<string, unknown>>)
        .filter((h) => (h.status as string) === "CLEARED")
        .map((h) => ({
          ...mapApiHoldingToViewModel(h),
          memberName: (h.memberName as string) || "",
        })),
    };
  } catch {
    logFallback("getHoldingsData");
    return {
      members: mockMembers,
      currentHoldings: mockHoldings.filter((h) => !h.isCleared),
      clearedHoldings: mockHoldings.filter((h) => h.isCleared),
    };
  }
}

export async function getHoldingById(holdingId: string): Promise<{
  holding: Holding;
  detail: Record<string, unknown>;
  transactions: Array<Record<string, unknown>>;
}> {
  if (!USE_API_DATA) {
    const h = mockHoldings.find((h) => h.id === holdingId);
    if (!h) throw new Error(`Holding not found: ${holdingId}`);
    return { holding: h, detail: {}, transactions: [] };
  }

  try {
    const detail = await api.holding(holdingId);
    const holding = mapApiHoldingToViewModel(detail);
    const transactions = detail.transactions || [];
    return { holding, detail, transactions };
  } catch {
    logFallback("getHoldingById");
    const h = mockHoldings.find((h) => h.id === holdingId);
    if (!h) throw new Error(`Holding not found: ${holdingId}`);
    return { holding: h, detail: {}, transactions: [] };
  }
}

export async function getHoldingTransactions(holdingId: string) {
  if (!USE_API_DATA) return [];
  try {
    return await api.holdingTransactions(holdingId);
  } catch {
    logFallback("getHoldingTransactions");
    return [];
  }
}

// ── Brief ──

export async function getDailyBriefData(): Promise<BriefViewModel> {
  if (!USE_API_DATA) return mockBrief as unknown as BriefViewModel;

  try {
    const brief = await api.dailyBrief();
    const date = brief.date?.substring(0, 10) || new Date().toISOString().substring(0, 10);
    return mapApiDailyBriefToViewModel(brief, date);
  } catch {
    logFallback("getDailyBriefData");
    return mockBrief as unknown as BriefViewModel;
  }
}

// ── Settings ──

export async function getSettingsData(): Promise<{
  appearance: AppearanceSettings;
  pushSettings: WeChatPushSettings;
  returnMethod: ReturnMethodSettings;
}> {
  if (!USE_API_DATA) {
    return {
      appearance: mockAppearance,
      pushSettings: mockPush,
      returnMethod: mockReturnMethod,
    };
  }

  try {
    const settings = await api.settings();
    return mapApiSettingsToViewModel(settings);
  } catch {
    logFallback("getSettingsData");
    return {
      appearance: mockAppearance,
      pushSettings: mockPush,
      returnMethod: mockReturnMethod,
    };
  }
}
