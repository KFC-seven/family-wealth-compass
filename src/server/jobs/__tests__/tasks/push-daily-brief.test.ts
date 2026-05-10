import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    household: { findFirst: vi.fn() },
    dailyBrief: { findFirst: vi.fn(), update: vi.fn() },
    portfolioSnapshot: { findFirst: vi.fn() },
    pushNotification: { create: vi.fn() },
  },
}));

const { mockSendDailyBrief } = vi.hoisted(() => ({
  mockSendDailyBrief: vi.fn(),
}));

const { mockGetPushProvider } = vi.hoisted(() => ({
  mockGetPushProvider: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/server/push/registry", () => ({ getPushProvider: mockGetPushProvider }));

import { pushDailyBriefJob } from "../../tasks/push-daily-brief";
import type { JobContext } from "../../types";

function makeCtx(overrides: Partial<JobContext> = {}): JobContext {
  return { jobName: "push-daily-brief", trigger: "SCHEDULER", jobRunId: "run-001", ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pushDailyBriefJob", () => {
  it("returns SKIPPED when no household exists", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(null);

    const result = await pushDailyBriefJob.execute(makeCtx());

    expect(result.status).toBe("SKIPPED");
    expect(result.metadata).toEqual(expect.objectContaining({ reason: "无 Household" }));
    expect(mockPrisma.dailyBrief.findFirst).not.toHaveBeenCalled();
  });

  it("returns SKIPPED when no brief exists for the date", async () => {
    mockPrisma.household.findFirst.mockResolvedValue({ id: "hh-001" });
    mockPrisma.dailyBrief.findFirst.mockResolvedValue(null);

    const result = await pushDailyBriefJob.execute(makeCtx({ date: "2026-05-11" }));

    expect(result.status).toBe("SKIPPED");
    expect(result.metadata).toEqual(expect.objectContaining({ reason: expect.stringContaining("2026-05-11") }));
    expect(mockGetPushProvider).not.toHaveBeenCalled();
  });

  it("returns SUCCESS and records PushNotification when push succeeds", async () => {
    const pushProvider = {
      name: "mock",
      sendDailyBrief: mockSendDailyBrief,
    };
    mockGetPushProvider.mockReturnValue(pushProvider);
    mockPrisma.household.findFirst.mockResolvedValue({ id: "hh-001" });
    mockPrisma.dailyBrief.findFirst.mockResolvedValue({
      id: "brief-001",
      title: "今日简报",
      summary: "市场平稳",
      riskAlerts: [],
      adviceCards: [],
      pushStatus: null,
    });
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue({
      dailyReturn: 500,
      totalAssets: 50000,
    });
    mockSendDailyBrief.mockResolvedValue({
      success: true,
      provider: "mock",
      message: "OK",
      sentAt: "2026-05-11T01:00:00.000Z",
    });
    mockPrisma.pushNotification.create.mockResolvedValue({ id: "pn-001" });
    mockPrisma.dailyBrief.update.mockResolvedValue({});

    const result = await pushDailyBriefJob.execute(makeCtx({ date: "2026-05-11" }));

    expect(result.status).toBe("SUCCESS");
    expect(result.successCount).toBe(1);

    // Verify push notification was recorded
    expect(mockPrisma.pushNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          householdId: "hh-001",
          briefId: "brief-001",
          status: "SENT",
        }),
      }),
    );

    // Verify brief pushStatus was updated
    expect(mockPrisma.dailyBrief.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "brief-001" },
        data: expect.objectContaining({
          pushStatus: expect.objectContaining({
            pushed: true,
            success: true,
          }),
        }),
      }),
    );
  });

  it("returns FAILED when push fails", async () => {
    const pushProvider = {
      name: "server-chan",
      sendDailyBrief: mockSendDailyBrief,
    };
    mockGetPushProvider.mockReturnValue(pushProvider);
    mockPrisma.household.findFirst.mockResolvedValue({ id: "hh-001" });
    mockPrisma.dailyBrief.findFirst.mockResolvedValue({
      id: "brief-002",
      title: "今日简报",
      summary: "测试",
      riskAlerts: [],
      adviceCards: [],
      pushStatus: null,
    });
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue({
      dailyReturn: 100,
      totalAssets: 30000,
    });
    mockSendDailyBrief.mockResolvedValue({
      success: false,
      provider: "server-chan",
      message: "API rate limited",
      sentAt: "",
    });
    mockPrisma.pushNotification.create.mockResolvedValue({ id: "pn-002" });
    mockPrisma.dailyBrief.update.mockResolvedValue({});

    const result = await pushDailyBriefJob.execute(makeCtx());

    expect(result.status).toBe("FAILED");
    expect(result.failureCount).toBe(1);

    // Push notification should record failure
    expect(mockPrisma.pushNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "API rate limited",
        }),
      }),
    );

    // Brief pushStatus should record failure
    expect(mockPrisma.dailyBrief.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pushStatus: expect.objectContaining({
            pushed: false,
            success: false,
          }),
        }),
      }),
    );
  });

  it("returns FAILED when push throws an exception", async () => {
    mockPrisma.household.findFirst.mockResolvedValue({ id: "hh-001" });
    mockPrisma.dailyBrief.findFirst.mockResolvedValue({
      id: "brief-003",
      title: "简报",
      summary: "内容",
      riskAlerts: [],
      adviceCards: [],
      pushStatus: null,
    });
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue({
      dailyReturn: 0,
      totalAssets: 10000,
    });
    mockGetPushProvider.mockImplementation(() => {
      throw new Error("provider not configured");
    });

    const result = await pushDailyBriefJob.execute(makeCtx());

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("provider not configured");
  });
});
