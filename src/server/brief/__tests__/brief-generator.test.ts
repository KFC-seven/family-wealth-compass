import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { AiBriefOutput } from "@/server/ai/types";
import type { BriefContext } from "../types";

// ---- Hoisted mocks (run before imports) ----

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    household: { findFirst: vi.fn() },
    dailyBrief: { findFirst: vi.fn(), upsert: vi.fn() },
    aiGenerationRun: { create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));

const mockAiOutput: AiBriefOutput = {
  title: "测试家庭 每日投资简报",
  summary: "今日整体组合表现平稳，无重大风险信号。",
  marketOverview: [
    { market: "A股", direction: "neutral", summary: "市场小幅波动" },
  ],
  householdImpact: {
    direction: "neutral",
    summary: "整体组合平稳",
    mainContributors: ["沪深300ETF"],
    mainRisks: [],
  },
  memberImpacts: [
    { memberName: "张三", summary: "今日收益+500", todayReturn: 500 },
  ],
  riskAlerts: [],
  adviceCards: [],
  newsItems: [],
  disclaimer: "以上内容为基于持仓数据和公开信息的辅助分析，不构成确定性投资指令",
};

const mockContext: BriefContext = {
  householdName: "测试家庭",
  baseCurrency: "CNY",
  date: "2026-05-11",
  totalAssets: 1000000,
  dailyReturn: 5000,
  cumulativeReturn: 80000,
  holdingReturn: 30000,
  realizedReturn: 20000,
  cashBalance: 50000,
  members: [],
  riskSignals: [],
  newsHighlights: [],
  marketSummary: "Mock 市场概况",
};

// Mock context-builder to avoid needing full prisma mocks for member/snapshot queries
vi.mock("@/server/brief/context-builder", () => ({
  buildBriefContext: vi.fn(),
}));

import { buildBriefContext } from "../context-builder";

// Mock the mock-ai-provider module (used by brief-generator's dynamic import fallback)
const mockFallbackProvider = {
  name: "mock",
  isEnabled: vi.fn().mockReturnValue(true),
  generateStructuredBrief: vi.fn(),
  healthCheck: vi.fn(),
};

vi.mock("@/server/ai/providers/mock-ai-provider", () => ({
  MockAiProvider: function() { return mockFallbackProvider; },
}));

const mockAiProvider = {
  name: "mock-test",
  isEnabled: vi.fn().mockReturnValue(true),
  generateStructuredBrief: vi.fn(),
  healthCheck: vi.fn(),
};

vi.mock("@/server/ai/registry", () => ({
  getAiProvider: vi.fn(() => mockAiProvider),
}));

import { generateDailyBrief } from "../brief-generator";

// ---- Helpers ----

function makeHousehold(overrides: Record<string, unknown> = {}) {
  return {
    id: "hh-001",
    name: "测试家庭",
    baseCurrency: "CNY",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeAiRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-001",
    householdId: "hh-001",
    status: "RUNNING",
    provider: "MOCK",
    model: "mock",
    startedAt: new Date(),
    ...overrides,
  };
}

const mockBrief = {
  id: "brief-001",
  householdId: "hh-001",
  date: new Date("2026-05-11"),
  status: "GENERATED",
  title: "测试家庭 每日投资简报",
  summary: "今日整体组合表现平稳",
  generatedAt: new Date(),
};

function resetAll() {
  Object.values(mockPrisma).forEach((m: any) =>
    Object.values(m).forEach((f: any) => f.mockReset())
  );
  mockAiProvider.generateStructuredBrief.mockReset();
  mockFallbackProvider.generateStructuredBrief.mockReset();
  (buildBriefContext as any).mockReset();
}

// ---- Tests ----

describe("generateDailyBrief", () => {
  beforeEach(() => {
    resetAll();

    // Default prisma mocks
    mockPrisma.household.findFirst.mockResolvedValue(makeHousehold());
    mockPrisma.aiGenerationRun.create.mockResolvedValue(makeAiRun());
    mockPrisma.aiGenerationRun.update.mockResolvedValue({});
    mockPrisma.dailyBrief.upsert.mockResolvedValue(mockBrief);

    // Default context-builder mock
    (buildBriefContext as any).mockResolvedValue(mockContext);

    // Default AI provider mock
    mockAiProvider.generateStructuredBrief.mockResolvedValue(mockAiOutput);

    // Default fallback provider
    mockFallbackProvider.generateStructuredBrief.mockResolvedValue(mockAiOutput);
  });

  it("throws when no household exists", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(null);
    await expect(generateDailyBrief({ date: "2026-05-11" })).rejects.toThrow("无 Household");
  });

  it("returns existing brief when status=GENERATED and force=false", async () => {
    mockPrisma.dailyBrief.findFirst.mockResolvedValue(mockBrief);

    const result = await generateDailyBrief({ date: "2026-05-11" });

    expect(result).toEqual(mockBrief);
    expect(mockPrisma.aiGenerationRun.create).not.toHaveBeenCalled();
    expect(mockAiProvider.generateStructuredBrief).not.toHaveBeenCalled();
  });

  it("regenerates when force=true even if existing brief exists", async () => {
    mockPrisma.dailyBrief.findFirst.mockResolvedValue(mockBrief);

    await generateDailyBrief({ date: "2026-05-11", force: true });

    expect(mockPrisma.aiGenerationRun.create).toHaveBeenCalled();
    expect(mockAiProvider.generateStructuredBrief).toHaveBeenCalled();
  });

  it("regenerates when existing brief status is not GENERATED", async () => {
    mockPrisma.dailyBrief.findFirst.mockResolvedValue({ ...mockBrief, status: "FAILED" });

    await generateDailyBrief({ date: "2026-05-11" });

    expect(mockAiProvider.generateStructuredBrief).toHaveBeenCalled();
  });

  it("creates DailyBrief on successful AI generation", async () => {
    mockPrisma.dailyBrief.findFirst.mockResolvedValue(null);

    const result = await generateDailyBrief({ date: "2026-05-11" });

    expect(result).toBeDefined();
    expect(mockPrisma.aiGenerationRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "RUNNING" }),
      })
    );
    expect(mockPrisma.aiGenerationRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS" }),
      })
    );
    expect(mockPrisma.dailyBrief.upsert).toHaveBeenCalled();
  });

  it("creates AiGenerationRun with RUNNING -> SUCCESS and links to brief", async () => {
    mockPrisma.dailyBrief.findFirst.mockResolvedValue(null);

    await generateDailyBrief({ date: "2026-05-11" });

    const createCall = mockPrisma.aiGenerationRun.create.mock.calls[0][0];
    expect(createCall.data.status).toBe("RUNNING");

    // Should have a SUCCESS update
    const successUpdate = mockPrisma.aiGenerationRun.update.mock.calls.find(
      (call: any) => call[0]?.data?.status === "SUCCESS" || call[1]?.data?.status === "SUCCESS"
    );
    expect(successUpdate).toBeDefined();

    // Should link briefId
    const linkUpdate = mockPrisma.aiGenerationRun.update.mock.calls.find(
      (call: any) => call[0]?.data?.briefId === "brief-001" || call[1]?.data?.briefId === "brief-001"
    );
    expect(linkUpdate).toBeDefined();
  });

  it("falls back to MockAiProvider when primary AI fails", async () => {
    mockPrisma.dailyBrief.findFirst.mockResolvedValue(null);
    mockAiProvider.generateStructuredBrief.mockRejectedValue(new Error("API error"));

    const result = await generateDailyBrief({ date: "2026-05-11" });

    expect(result).toBeDefined();
    // AiGenerationRun should still be SUCCESS (because fallback succeeded)
    expect(mockPrisma.aiGenerationRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS" }),
      })
    );
  });

  it("throws original error when both AI and mock fallback fail", async () => {
    mockPrisma.dailyBrief.findFirst.mockResolvedValue(null);
    mockAiProvider.generateStructuredBrief.mockRejectedValue(new Error("API error"));
    mockFallbackProvider.generateStructuredBrief.mockRejectedValue(new Error("Mock also failed"));

    await expect(generateDailyBrief({ date: "2026-05-11" })).rejects.toThrow("API error");

    // AiGenerationRun should be updated to FAILED
    expect(mockPrisma.aiGenerationRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      })
    );
  });

  it("falls back to Mock AI when primary AI output has forbidden words", async () => {
    mockPrisma.dailyBrief.findFirst.mockResolvedValue(null);

    mockAiProvider.generateStructuredBrief.mockResolvedValue({
      ...mockAiOutput,
      summary: "这是一个保证收益的机会",
    });

    // The primary AI output fails safety check, but the code falls back
    // to MockAiProvider which generates clean output (no safety check on fallback)
    const result = await generateDailyBrief({ date: "2026-05-11" });

    expect(result).toBeDefined();
    expect(mockPrisma.dailyBrief.upsert).toHaveBeenCalled();
  });

  it("uses default date (today) when no date provided", async () => {
    mockPrisma.dailyBrief.findFirst.mockResolvedValue(null);

    await generateDailyBrief({});

    expect(mockPrisma.aiGenerationRun.create).toHaveBeenCalled();
  });
});
