import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to create mutable control variables
const { mockUseApi } = vi.hoisted(() => ({ mockUseApi: { value: false } }));

const mockApi = {
  householdSummary: vi.fn(),
  members: vi.fn(),
  member: vi.fn(),
  memberSummary: vi.fn(),
  holdings: vi.fn(),
  holding: vi.fn(),
  holdingTransactions: vi.fn(),
  dailyBrief: vi.fn(),
  settings: vi.fn(),
};

const mockMappers = {
  mapApiHoldingToViewModel: vi.fn((h: Record<string, unknown>) => ({
    id: h.id as string,
    memberId: h.memberId as string || "",
    assetName: (h.assetName as string) || "",
    assetType: (h.assetType as string) || "cash",
    marketValue: (h.marketValue as number) || 0,
    holdingReturn: (h.holdingReturn as number) || 0,
    realizedReturn: (h.realizedReturn as number) || 0,
    cumulativeReturn: (h.cumulativeReturn as number) || 0,
    isCleared: (h.status as string) === "CLEARED",
  })),
  mapApiMemberToViewModel: vi.fn((m: Record<string, unknown>) => ({
    id: m.id as string,
    name: (m.name as string) || "",
    totalAssets: 0,
    cashBalance: 0,
    holdingReturn: 0,
    realizedReturn: 0,
    cumulativeReturn: 0,
    cumulativeReturnRate: null,
    holdings: [],
    accounts: [],
  })),
  mapApiHouseholdToViewModel: vi.fn(() => ({
    totalAssets: 1000000,
    cashBalance: 50000,
    todayReturn: 0,
    holdingReturn: 10000,
    realizedReturn: 2000,
    cumulativeReturn: 12000,
    cumulativeReturnRate: null,
    members: [],
  })),
  mapApiDailyBriefToViewModel: vi.fn((b: Record<string, unknown>, date: string) => ({
    id: b.id as string,
    date,
    status: "generated",
    marketOverview: [],
    householdImpact: {},
    memberImpacts: [],
    news: [],
    riskAlerts: [],
    adviceCards: [],
    pushStatus: { pushed: false, channel: "disabled" },
  })),
  mapApiSettingsToViewModel: vi.fn(() => ({
    appearance: { theme: "system", returnColorScheme: "cn_red_up", defaultTimeRange: "近30日", defaultCurrency: "CNY", decimalPlaces: 2, privacyMode: false },
    pushSettings: { enabled: false, pushTime: "07:30", channel: "disabled" },
    returnMethod: { costMethod: "平均成本法" },
  })),
};

vi.mock("@/lib/api/api-client", () => ({
  get USE_API_DATA() { return mockUseApi.value; },
  api: mockApi,
}));

vi.mock("@/server/finance/mappers", () => mockMappers);

describe("data-source (mock mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApi.value = false;
  });

  it("exports getHousehold, returns mock data when USE_API_DATA=false", async () => {
    const { getHousehold } = await import("@/lib/data-source");
    const result = await getHousehold();

    expect(result.household).toBeDefined();
    expect(result.household.totalAssets).toBeGreaterThan(0);
    expect(result.dailyReturns).toBeInstanceOf(Array);
    expect(result.dailyReturns.length).toBeGreaterThan(0);
    expect(result.monthlyAssets).toBeInstanceOf(Array);
    expect(result.assetAllocation).toBeInstanceOf(Array);
    expect(result.memberAllocation).toBeInstanceOf(Array);
    expect(result.riskAlerts).toBeInstanceOf(Array);
    expect(result.topGainers).toBeInstanceOf(Array);
    expect(result.topLosers).toBeInstanceOf(Array);
    expect(result.briefPreview).toBeDefined();
    expect(result.briefPreview.hasNew).toBe(true);
  });

  it("getHousehold returns topGainers with positive returns only", async () => {
    const { getHousehold } = await import("@/lib/data-source");
    const result = await getHousehold();
    for (const g of result.topGainers) {
      expect(g.return_value).toBeGreaterThan(0);
    }
  });

  it("getHousehold returns topLosers with negative returns only", async () => {
    const { getHousehold } = await import("@/lib/data-source");
    const result = await getHousehold();
    for (const l of result.topLosers) {
      expect(l.return_value).toBeLessThan(0);
    }
  });

  it("exports getMembersData, returns members in mock mode", async () => {
    const { getMembersData } = await import("@/lib/data-source");
    const members = await getMembersData();
    expect(members).toBeInstanceOf(Array);
    expect(members.length).toBeGreaterThan(0);
    expect(members[0]).toHaveProperty("id");
    expect(members[0]).toHaveProperty("name");
    expect(members[0]).toHaveProperty("totalAssets");
  });

  it("exports getMemberById, finds member in mock mode", async () => {
    const { getMemberById } = await import("@/lib/data-source");
    const result = await getMemberById("member-1");
    expect(result.member).toBeDefined();
    expect(result.member.id).toBe("member-1");
    expect(result.currentHoldings).toBeInstanceOf(Array);
    expect(result.clearedHoldings).toBeInstanceOf(Array);
  });

  it("getMemberById returns first mock member when ID not found (known bug)", async () => {
    const { getMemberById } = await import("@/lib/data-source");
    const result = await getMemberById("nonexistent-id");
    // Known bug: returns first mock member instead of null
    expect(result.member).toBeDefined();
    expect(result.member.id).toBe("member-1");
  });

  it("exports getHoldingsData, splits current/cleared", async () => {
    const { getHoldingsData } = await import("@/lib/data-source");
    const result = await getHoldingsData();
    expect(result.members).toBeInstanceOf(Array);
    expect(result.currentHoldings).toBeInstanceOf(Array);
    expect(result.clearedHoldings).toBeInstanceOf(Array);
    for (const h of result.currentHoldings) {
      expect(h.isCleared).toBeFalsy();
    }
    for (const h of result.clearedHoldings) {
      expect(h.isCleared).toBe(true);
    }
  });

  it("exports getHoldingById, finds holding in mock mode", async () => {
    const { getHoldingById } = await import("@/lib/data-source");
    const result = await getHoldingById("h-1");
    expect(result.holding).toBeDefined();
    expect(result.holding.id).toBe("h-1");
  });

  it("getHoldingById returns first mock holding when ID not found (known bug)", async () => {
    const { getHoldingById } = await import("@/lib/data-source");
    const result = await getHoldingById("nonexistent-id");
    // Known bug: returns first mock holding instead of null
    expect(result.holding).toBeDefined();
    expect(result.holding.id).toBe("h-1");
  });

  it("exports getDailyBriefData, returns brief in mock mode", async () => {
    const { getDailyBriefData } = await import("@/lib/data-source");
    const brief = await getDailyBriefData();
    expect(brief).toBeDefined();
    expect(brief).toHaveProperty("date");
  });

  it("exports getSettingsData, returns settings in mock mode", async () => {
    const { getSettingsData } = await import("@/lib/data-source");
    const settings = await getSettingsData();
    expect(settings.appearance).toBeDefined();
    expect(settings.pushSettings).toBeDefined();
    expect(settings.returnMethod).toBeDefined();
  });

  it("exports getMemberSummaryData, returns summary for existing member", async () => {
    const { getMemberSummaryData } = await import("@/lib/data-source");
    const summary = await getMemberSummaryData("member-1");
    expect(summary).not.toBeNull();
    expect(summary?.memberId).toBe("member-1");
    expect(summary?.holdingCount).toBeGreaterThanOrEqual(0);
  });

  it("getMemberSummaryData returns null for non-existent member", async () => {
    const { getMemberSummaryData } = await import("@/lib/data-source");
    const summary = await getMemberSummaryData("nonexistent-id");
    expect(summary).toBeNull();
  });

  it("exports getHoldingTransactions, returns empty array in mock mode", async () => {
    const { getHoldingTransactions } = await import("@/lib/data-source");
    const txs = await getHoldingTransactions("h-1");
    expect(txs).toBeInstanceOf(Array);
    expect(txs).toHaveLength(0);
  });
});

describe("data-source (API mode)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseApi.value = true;
    // Reset module cache so data-source re-imports with new USE_API_DATA value
    vi.resetModules();

    // Setup mock API responses
    mockApi.householdSummary.mockResolvedValue({
      householdId: "hh-001",
      name: "Test Family",
      totalAssets: 1000000,
      cashBalance: 50000,
      memberCount: 2,
    });
    mockApi.members.mockResolvedValue([
      { id: "m1", name: "爸爸", displayName: "爸爸", roleLabel: "管理员", isAdmin: true },
      { id: "m2", name: "妈妈", displayName: "妈妈", roleLabel: "成员", isAdmin: false },
    ]);
    mockApi.holdings.mockResolvedValue([
      { id: "h1", memberId: "m1", assetName: "贵州茅台", assetType: "A_SHARE", marketValue: 364000, holdingReturn: 28000, cumulativeReturn: 28000, status: "ACTIVE" },
      { id: "h2", memberId: "m2", assetName: "积存金", assetType: "GOLD_ACCUMULATION", marketValue: 239000, holdingReturn: 10000, cumulativeReturn: 10000, status: "ACTIVE" },
    ]);
    mockApi.memberSummary.mockResolvedValue({
      memberId: "m1", name: "爸爸", totalAssets: 500000, cashBalance: 50000,
      holdingReturn: 28000, realizedReturn: 5000, cumulativeReturn: 33000,
    });
  });

  it("getHousehold attempts API call in API mode", async () => {
    mockApi.householdSummary.mockRejectedValue(new Error("Simulated API error"));

    const { getHousehold } = await import("@/lib/data-source");
    const result = await getHousehold();

    // Verify API was called (proves API mode is active)
    expect(mockApi.householdSummary).toHaveBeenCalled();
    // Falls back to mock data on API failure
    expect(result.household).toBeDefined();
    expect(result.household.totalAssets).toBeGreaterThan(0);
  });

  it("getHousehold falls back to mock on API failure", async () => {
    mockApi.householdSummary.mockRejectedValue(new Error("API Error"));

    const { getHousehold } = await import("@/lib/data-source");
    const result = await getHousehold();

    // Falls back to mock data
    expect(result.household).toBeDefined();
    expect(result.household.totalAssets).toBeGreaterThan(0);
  });

  it("getHoldingsData fetches from API in API mode", async () => {
    const { getHoldingsData } = await import("@/lib/data-source");
    const result = await getHoldingsData();

    expect(mockApi.members).toHaveBeenCalled();
    expect(mockApi.holdings).toHaveBeenCalled();
    expect(result.currentHoldings).toBeInstanceOf(Array);
    expect(result.members).toBeInstanceOf(Array);
  });

  it("getHoldingsData falls back on API failure", async () => {
    mockApi.holdings.mockRejectedValue(new Error("API Error"));

    const { getHoldingsData } = await import("@/lib/data-source");
    const result = await getHoldingsData();

    expect(result.members).toBeInstanceOf(Array);
    expect(result.members.length).toBeGreaterThan(0);
  });

  it("getMemberById fetches from API in API mode", async () => {
    mockApi.member.mockResolvedValue({
      id: "m1",
      name: "爸爸",
      accounts: [],
      holdings: [{ id: "h1", assetName: "贵州茅台", assetType: "A_SHARE", marketValue: 364000, holdingReturn: 28000, cumulativeReturn: 28000 }],
    });

    const { getMemberById } = await import("@/lib/data-source");
    const result = await getMemberById("m1");

    expect(mockApi.member).toHaveBeenCalledWith("m1");
    expect(result.member).toBeDefined();
  });

  it("getMemberById falls back on API failure", async () => {
    mockApi.member.mockRejectedValue(new Error("API Error"));

    const { getMemberById } = await import("@/lib/data-source");
    const result = await getMemberById("member-1");

    expect(result.member).toBeDefined();
    // Falls back to mock data
    expect(result.member.id).toBe("member-1");
  });

  it("getDailyBriefData fetches from API in API mode", async () => {
    mockApi.dailyBrief.mockResolvedValue({
      id: "brief-api-001",
      date: "2026-04-28T00:00:00.000Z",
      status: "GENERATED",
      summary: "Test brief",
      householdImpact: null,
      marketOverview: null,
      memberImpacts: null,
      newsItems: null,
      riskAlerts: null,
      adviceCards: null,
      pushStatus: null,
    });

    const { getDailyBriefData } = await import("@/lib/data-source");
    const brief = await getDailyBriefData();

    expect(mockApi.dailyBrief).toHaveBeenCalled();
    expect(brief).toBeDefined();
  });
});
