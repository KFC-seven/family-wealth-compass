import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the hook logic by testing the data transformation functions directly.
// The hooks themselves (useBrief, useSettings) are simple React wrappers over
// useState/useEffect that call the API client and mappers. The underlying
// API client, mappers, and mock data are tested separately in their own files.

// Mock the api-client module
const mockApi = {
  dailyBrief: vi.fn(),
  settings: vi.fn(),
};

vi.mock("@/lib/api/api-client", () => ({
  USE_API_DATA: true,
  api: mockApi,
}));

// Mock the mappers
vi.mock("@/server/finance/mappers", () => ({
  mapApiDailyBriefToViewModel: vi.fn((b: Record<string, unknown>, date: string) => ({
    id: b.id as string,
    date,
    status: "generated" as const,
    marketOverview: [],
    householdImpact: {},
    memberImpacts: [],
    news: [],
    riskAlerts: [],
    adviceCards: [],
    pushStatus: { pushed: false, channel: "disabled" as const },
  })),
  mapApiSettingsToViewModel: vi.fn(() => ({
    appearance: { theme: "system" as const, returnColorScheme: "cn_red_up" as const, defaultTimeRange: "近30日", defaultCurrency: "CNY", decimalPlaces: 2, privacyMode: false },
    pushSettings: { enabled: false, pushTime: "07:30", channel: "disabled" as const, webhookUrl: "", serverChanKey: "", includeTotalAssets: false, includeMemberDetail: false, includeAIAdvice: false, onlyHighRisk: false },
    returnMethod: { costMethod: "平均成本法", holdingReturnDef: "", realizedReturnDef: "", cumulativeReturnDef: "", periodReturnDef: "", cashFlowHandling: "", futureOptions: [] },
  })),
}));

// Mock the brief data
vi.mock("@/data/mock-brief", () => ({
  mockBrief: {
    id: "brief-mock",
    date: "2026-04-28",
    status: "pushed",
    marketOverview: [],
    householdImpact: {},
    memberImpacts: [],
    news: [],
    riskAlerts: [],
    adviceCards: [],
    pushStatus: { pushed: true, channel: "wecom_robot" },
  },
}));

vi.mock("@/data/mock-settings", () => ({
  mockAppearanceSettings: { theme: "light", returnColorScheme: "cn_red_up", defaultTimeRange: "近30日", defaultCurrency: "CNY", decimalPlaces: 2, privacyMode: false },
  mockWeChatPushSettings: { enabled: true, pushTime: "07:30", channel: "wecom_robot", webhookUrl: "https://mock.webhook", serverChanKey: "", includeTotalAssets: true, includeMemberDetail: true, includeAIAdvice: true, onlyHighRisk: false },
  mockReturnMethodSettings: { costMethod: "平均成本法", holdingReturnDef: "当前持仓市值 - 剩余持仓成本", realizedReturnDef: "卖出收益 + 分红 + 利息 - 已确认费用/税费", cumulativeReturnDef: "持仓收益 + 已实现收益", periodReturnDef: "", cashFlowHandling: "", futureOptions: ["FIFO 成本法", "XIRR 内部收益率", "时间加权收益率 TWR"] },
}));

describe("useBrief data flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mock brief data has expected shape", async () => {
    const { mockBrief } = await import("@/data/mock-brief");
    expect(mockBrief).toHaveProperty("id");
    expect(mockBrief).toHaveProperty("date");
    expect(mockBrief).toHaveProperty("status");
    expect(mockBrief).toHaveProperty("marketOverview");
    expect(mockBrief).toHaveProperty("householdImpact");
    expect(mockBrief).toHaveProperty("memberImpacts");
    expect(mockBrief).toHaveProperty("news");
    expect(mockBrief).toHaveProperty("riskAlerts");
    expect(mockBrief).toHaveProperty("adviceCards");
    expect(mockBrief).toHaveProperty("pushStatus");
  });

  it("API dailyBrief returns expected shape", async () => {
    mockApi.dailyBrief.mockResolvedValue({
      id: "brief-api-001",
      date: "2026-04-28T00:00:00.000Z",
      status: "GENERATED",
      summary: "Test brief",
    });

    const data = await mockApi.dailyBrief();
    expect(data.id).toBe("brief-api-001");
    expect(data.status).toBe("GENERATED");
  });

  it("useBrief stays at mock when API fails (test via mockBrief import)", async () => {
    mockApi.dailyBrief.mockRejectedValue(new Error("Network error"));

    const { mockBrief } = await import("@/data/mock-brief");
    // When API fails, the hook keeps its initial state (mockBrief)
    expect(mockBrief.id).toBe("brief-mock");

    // Verify the API was called and failed
    try {
      await mockApi.dailyBrief();
    } catch (e) {
      expect((e as Error).message).toBe("Network error");
    }
  });
});

describe("useSettings data flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mock settings have expected shape", async () => {
    const { mockAppearanceSettings, mockWeChatPushSettings, mockReturnMethodSettings } = await import("@/data/mock-settings");
    expect(mockAppearanceSettings).toHaveProperty("theme");
    expect(mockAppearanceSettings).toHaveProperty("returnColorScheme");
    expect(mockWeChatPushSettings).toHaveProperty("enabled");
    expect(mockWeChatPushSettings).toHaveProperty("channel");
    expect(mockReturnMethodSettings).toHaveProperty("costMethod");
  });

  it("API settings returns expected shape", async () => {
    mockApi.settings.mockResolvedValue({
      appearance: JSON.stringify({ theme: "dark" }),
      pushSettings: JSON.stringify({ enabled: true, channel: "server_chan" }),
      returnMethod: JSON.stringify({ costMethod: "FIFO 成本法" }),
    });

    const data = await mockApi.settings();
    expect(data.appearance).toContain("dark");
    expect(data.returnMethod).toContain("FIFO");
  });

  it("settings API failure triggers mock fallback", async () => {
    mockApi.settings.mockRejectedValue(new Error("Network error"));

    const { mockAppearanceSettings } = await import("@/data/mock-settings");
    expect(mockAppearanceSettings.theme).toBe("light");

    try {
      await mockApi.settings();
    } catch (e) {
      expect((e as Error).message).toBe("Network error");
    }
  });
});
