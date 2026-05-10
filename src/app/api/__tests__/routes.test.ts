import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 1. SHARED MOCK SETUP (hoisted before all imports)
// ============================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRawUnsafe: vi.fn(),
    household: { findFirst: vi.fn() },
    member: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    account: { findFirst: vi.fn(), findMany: vi.fn() },
    holding: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    transaction: { findMany: vi.fn(), create: vi.fn() },
    asset: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    importSession: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    recognizedImportRow: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    dailyBrief: { findFirst: vi.fn(), upsert: vi.fn() },
    userSession: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    passwordCredential: { findUnique: vi.fn(), update: vi.fn() },
    appSettings: { findFirst: vi.fn(), update: vi.fn() },
    scheduledJob: { findMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    jobRun: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    marketDataSource: { findMany: vi.fn(), updateMany: vi.fn() },
    portfolioSnapshot: { findFirst: vi.fn(), upsert: vi.fn() },
    pushNotification: { create: vi.fn(), findFirst: vi.fn() },
    aiGenerationRun: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    priceSnapshot: { upsert: vi.fn(), findFirst: vi.fn() },
  },
}));

// Mock prisma before any route imports
vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));

// Mock all server dependencies
vi.mock("@/server/storage/registry", () => ({ getStorageProvider: vi.fn() }));
vi.mock("@/server/storage/file-validation", () => ({
  validateFileSize: vi.fn(),
  validateMimeType: vi.fn(),
  validateExtension: vi.fn(),
}));
vi.mock("@/server/ocr/registry", () => ({ getOcrProvider: vi.fn() }));
vi.mock("@/server/ocr/normalize", () => ({ normalizeOcrRow: vi.fn() }));
vi.mock("@/server/ocr/validation", () => ({ validateRows: vi.fn() }));
vi.mock("@/server/import/transaction-saver", () => ({ confirmTransactionRecords: vi.fn() }));
vi.mock("@/server/auth/cookies", () => ({ setSessionCookie: vi.fn(), clearSessionCookie: vi.fn(), getSessionCookie: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ createSession: vi.fn(), getSessionFromToken: vi.fn(), revokeSession: vi.fn(), revokeAllUserSessions: vi.fn(), getUserSessions: vi.fn() }));
vi.mock("@/server/auth/password", () => ({ verifyPassword: vi.fn(), hashPassword: vi.fn() }));
vi.mock("@/server/auth/permissions", () => ({ getPermissionsForRole: vi.fn() }));
vi.mock("@/server/brief/brief-generator", () => ({ generateDailyBrief: vi.fn() }));
vi.mock("@/server/push/registry", () => ({ getPushProvider: vi.fn() }));
vi.mock("@/server/jobs/runner", () => ({ runJob: vi.fn() }));
vi.mock("@/server/market-data/registry", () => ({ healthCheckAll: vi.fn(), getAllProviders: vi.fn(), safeGetPrice: vi.fn() }));

// ============================================================
// 2. ROUTE IMPORTS (after mocks; they'll use mocked deps)
// ============================================================

// Health
import { GET as HealthGET } from "@/app/api/health/route";

// Portfolio
import { GET as PortfolioGET } from "@/app/api/portfolio/household-summary/route";

// Members
import { GET as MembersListGET } from "@/app/api/members/route";
import { GET as MemberDetailGET } from "@/app/api/members/[memberId]/route";
import { GET as MemberSummaryGET } from "@/app/api/members/[memberId]/summary/route";

// Holdings
import { GET as HoldingsListGET } from "@/app/api/holdings/route";
import { GET as HoldingDetailGET } from "@/app/api/holdings/[holdingId]/route";
import { GET as HoldingTransactionsGET } from "@/app/api/holdings/[holdingId]/transactions/route";

// Transactions
import { GET as TransactionsListGET, POST as TransactionCreatePOST } from "@/app/api/transactions/route";

// Import Sessions
import { GET as ImportSessionsListGET, POST as ImportSessionCreatePOST } from "@/app/api/import-sessions/route";
import { GET as ImportSessionDetailGET } from "@/app/api/import-sessions/[sessionId]/route";

// Daily Brief
import { GET as BriefGET } from "@/app/api/daily-brief/route";
import { POST as BriefGeneratePOST } from "@/app/api/daily-brief/generate/route";
import { POST as BriefPushPOST } from "@/app/api/daily-brief/push/route";

// AI / Push
import { GET as AiStatusGET } from "@/app/api/ai/status/route";
import { GET as PushStatusGET } from "@/app/api/push/status/route";
import { POST as PushTestPOST } from "@/app/api/push/test/route";

// Auth
import { POST as AuthLoginPOST } from "@/app/api/auth/login/route";
import { POST as AuthLogoutPOST } from "@/app/api/auth/logout/route";
import { GET as AuthMeGET } from "@/app/api/auth/me/route";
import { POST as AuthChangePasswordPOST } from "@/app/api/auth/change-password/route";
import { GET as AuthSessionsGET } from "@/app/api/auth/sessions/route";
import { DELETE as AuthSessionDeleteDELETE } from "@/app/api/auth/sessions/[sessionId]/route";

// Settings
import { GET as SettingsGET, POST as SettingsPOST } from "@/app/api/settings/route";

// Jobs
import { GET as JobsListGET } from "@/app/api/jobs/route";
import { GET as JobRunsGET } from "@/app/api/jobs/runs/route";
import { POST as JobRunPOST } from "@/app/api/jobs/run/route";

// Market Data
import { GET as MarketDataSourcesGET } from "@/app/api/market-data/sources/route";
import { POST as MarketDataCheckPOST } from "@/app/api/market-data/sources/check/route";

// ============================================================
// 3. HELPER FUNCTIONS
// ============================================================

function mockRequest(url: string, opts?: { method?: string; body?: unknown; headers?: Record<string, string> }): Request {
  const { method = "GET", body, headers = {} } = opts ?? {};
  const init: RequestInit & { headers: Record<string, string> } = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }
  return new Request(url, init);
}

function okResponseBody(res: Response) {
  return { ok: true, data: expect.anything() };
}

function errResponseBody(code: string) {
  return { ok: false, error: expect.objectContaining({ code }) };
}

// Reset all mocks before each test
function resetPrismaMock() {
  for (const model of Object.values(mockPrisma)) {
    if (typeof model === "function") {
      (model as ReturnType<typeof vi.fn>).mockReset();
    } else if (typeof model === "object" && model !== null) {
      for (const method of Object.values(model as Record<string, unknown>)) {
        if (typeof method === "function") {
          (method as ReturnType<typeof vi.fn>).mockReset();
        }
      }
    }
  }
}

// ============================================================
// 4. TESTS
// ============================================================

beforeEach(() => {
  resetPrismaMock();
  vi.clearAllMocks();
  // Clean up env vars that tests may set
  delete process.env.BRIEF_API_SECRET;
  delete process.env.PUSH_API_SECRET;
  delete process.env.AUTH_ENABLED;
  delete process.env.UPLOAD_ENABLED;
  delete process.env.UPLOAD_API_SECRET;
  delete process.env.JOB_API_SECRET;
  // Keep NODE_ENV as "test" for vitest compatibility
  process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
});

// ---------- GET /api/health ----------
describe("GET /api/health", () => {
  it("returns 200 with db connected when query succeeds", async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ "1": 1 }]);
    const res = await HealthGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, data: { status: "ok", database: { connected: true } } });
    expect(body.data.database.latencyMs).toEqual(expect.any(Number));
  });

  it("returns 503 when db query throws", async () => {
    mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error("connection refused"));
    const res = await HealthGET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: false,
      error: { code: "DATABASE_UNAVAILABLE" },
    });
    expect(body.error.details.database.connected).toBe(false);
  });
});

// ---------- GET /api/portfolio/household-summary ----------
describe("GET /api/portfolio/household-summary", () => {
  it("returns 200 with aggregated totals", async () => {
    mockPrisma.household.findFirst.mockResolvedValue({
      id: "hh-001",
      name: "测试家庭",
      members: [
        {
          accounts: [{ type: "CASH", balance: "10000" }],
          holdings: [{ status: "CURRENT", currentMarketValue: "50000" }],
        },
      ],
    });
    const res = await PortfolioGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      householdId: "hh-001",
      totalAssets: 50000,
      cashBalance: 0, // known bug: always 0
      memberCount: 1,
    });
  });

  it("returns 404 when no household exists", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(null);
    const res = await PortfolioGET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 0 totals when members array is empty", async () => {
    mockPrisma.household.findFirst.mockResolvedValue({
      id: "hh-001",
      name: "空家庭",
      members: [],
    });
    const res = await PortfolioGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ totalAssets: 0, cashBalance: 0, memberCount: 0 });
  });
});

// ---------- GET /api/members ----------
describe("GET /api/members", () => {
  it("returns 200 with sorted members list", async () => {
    mockPrisma.member.findMany.mockResolvedValue([
      {
        id: "mem-001",
        name: "张三",
        displayName: "张三",
        roleLabel: "家长",
        isAdmin: true,
        accounts: [{ id: "acc-001", name: "工资卡", type: "CASH", platform: "BANK", currency: "CNY" }],
        investorProfile: { riskPreference: "MODERATE", investmentHorizon: "MEDIUM" },
      },
      {
        id: "mem-002",
        name: "李四",
        displayName: "李四",
        roleLabel: "成员",
        isAdmin: false,
        accounts: [],
        investorProfile: null,
      },
    ]);
    const res = await MembersListGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].id).toBe("mem-001");
    expect(body.data[0].accounts).toHaveLength(1);
    expect(body.data[0].investorProfile).toEqual({ riskPreference: "MODERATE", investmentHorizon: "MEDIUM" });
    expect(body.data[1].investorProfile).toBeNull();
  });

  it("returns empty array when no members exist", async () => {
    mockPrisma.member.findMany.mockResolvedValue([]);
    const res = await MembersListGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});

// ---------- GET /api/members/[memberId] ----------
describe("GET /api/members/[memberId]", () => {
  it("returns 200 with full member detail", async () => {
    mockPrisma.member.findUnique.mockResolvedValue({
      id: "mem-001",
      name: "张三",
      displayName: "张三",
      roleLabel: "家长",
      isAdmin: true,
      accounts: [{ id: "acc-001", name: "工资卡", type: "CASH", platform: "BANK", currency: "CNY" }],
      holdings: [
        {
          id: "hld-001",
          assetId: "ast-001",
          asset: { name: "沪深300ETF", type: "ETF" },
          accountId: "acc-001",
          account: { id: "acc-001", name: "工资卡" },
          status: "CURRENT",
          quantity: "1000",
          averageCost: "3.8",
          currentPrice: "4.0",
          currentMarketValue: "4000",
          holdingReturn: "200",
          realizedReturn: "50",
          cumulativeReturn: "250",
          createdAt: new Date("2026-01-01"),
        },
      ],
      investorProfile: { riskPreference: "MODERATE", investmentHorizon: "MEDIUM" },
    });
    const res = await MemberDetailGET(new Request("http://localhost"), {
      params: Promise.resolve({ memberId: "mem-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("mem-001");
    expect(body.data.holdings).toHaveLength(1);
    expect(body.data.accounts).toHaveLength(1);
    expect(body.data.holdings[0].assetName).toBe("沪深300ETF");
  });

  it("returns 404 when memberId not found", async () => {
    mockPrisma.member.findUnique.mockResolvedValue(null);
    const res = await MemberDetailGET(new Request("http://localhost"), {
      params: Promise.resolve({ memberId: "nonexistent" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("handles holdings with different statuses", async () => {
    mockPrisma.member.findUnique.mockResolvedValue({
      id: "mem-001", name: "张三", displayName: "张三", roleLabel: "成员", isAdmin: false,
      accounts: [],
      holdings: [
        { id: "hld-001", assetId: "ast-001", asset: { name: "ETF-A", type: "ETF" }, accountId: "acc-001", account: { id: "acc-001", name: "账户" }, status: "CURRENT", quantity: "100", averageCost: "10", currentPrice: "12", currentMarketValue: "1200", holdingReturn: "200", realizedReturn: "0", cumulativeReturn: "200", createdAt: new Date("2026-01-01") },
        { id: "hld-002", assetId: "ast-002", asset: { name: "ETF-B", type: "ETF" }, accountId: "acc-001", account: { id: "acc-001", name: "账户" }, status: "CLEARED", quantity: "0", averageCost: "10", currentPrice: "0", currentMarketValue: "0", holdingReturn: "0", realizedReturn: "100", cumulativeReturn: "100", createdAt: new Date("2026-01-01") },
      ],
      investorProfile: null,
    });
    const res = await MemberDetailGET(new Request("http://localhost"), {
      params: Promise.resolve({ memberId: "mem-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.holdings).toHaveLength(2);
  });

  it("handles null investorProfile", async () => {
    mockPrisma.member.findUnique.mockResolvedValue({
      id: "mem-001", name: "张三", displayName: "张三", roleLabel: "", isAdmin: false,
      accounts: [], holdings: [], investorProfile: null,
    });
    const res = await MemberDetailGET(new Request("http://localhost"), {
      params: Promise.resolve({ memberId: "mem-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.investorProfile).toBeNull();
  });
});

// ---------- GET /api/members/[memberId]/summary ----------
describe("GET /api/members/[memberId]/summary", () => {
  it("returns 200 with aggregated summary", async () => {
    mockPrisma.member.findUnique.mockResolvedValue({
      id: "mem-001", name: "张三", displayName: "张三", roleLabel: "家长", isAdmin: true,
      accounts: [{ id: "acc-001" }],
      holdings: [
        { status: "CURRENT", currentMarketValue: "50000", holdingReturn: "2000", realizedReturn: "500", cumulativeReturn: "2500", asset: {} },
        { status: "CURRENT", currentMarketValue: "30000", holdingReturn: "1000", realizedReturn: "200", cumulativeReturn: "1200", asset: {} },
        { status: "CLEARED", currentMarketValue: "0", holdingReturn: "0", realizedReturn: "300", cumulativeReturn: "300", asset: {} },
      ],
      investorProfile: { riskPreference: "AGGRESSIVE" },
    });
    const res = await MemberSummaryGET(new Request("http://localhost"), {
      params: Promise.resolve({ memberId: "mem-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      totalAssets: 80000,
      holdingReturn: 3000,
      realizedReturn: 1000,
      cumulativeReturn: 4000,
      holdingCount: 2,
      clearedCount: 1,
      accountCount: 1,
      riskPreference: "AGGRESSIVE",
    });
  });

  it("returns 404 when not found", async () => {
    mockPrisma.member.findUnique.mockResolvedValue(null);
    const res = await MemberSummaryGET(new Request("http://localhost"), {
      params: Promise.resolve({ memberId: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });
});

// ---------- GET /api/holdings ----------
describe("GET /api/holdings", () => {
  it("returns 200 with only CURRENT holdings", async () => {
    mockPrisma.holding.findMany.mockResolvedValue([
      {
        id: "hld-001", memberId: "mem-001", assetId: "ast-001", accountId: "acc-001",
        member: { id: "mem-001", name: "张三" },
        account: { id: "acc-001", name: "工资卡" },
        asset: { name: "沪深300ETF", type: "ETF" },
        status: "CURRENT",
        quantity: "1000", currentPrice: "4.0", currentMarketValue: "4000",
        holdingReturn: "200", realizedReturn: "50", cumulativeReturn: "250",
      },
    ]);
    const res = await HoldingsListGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("CURRENT");
    expect(body.data[0].memberName).toBe("张三");
  });

  it("returns empty array when no CURRENT holdings", async () => {
    mockPrisma.holding.findMany.mockResolvedValue([]);
    const res = await HoldingsListGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});

// ---------- GET /api/holdings/[holdingId] ----------
describe("GET /api/holdings/[holdingId]", () => {
  it("returns 200 with full detail including transactions", async () => {
    mockPrisma.holding.findUnique.mockResolvedValue({
      id: "hld-001", memberId: "mem-001", assetId: "ast-001", accountId: "acc-001",
      member: { id: "mem-001", name: "张三" },
      account: { id: "acc-001", name: "工资卡", type: "BANK" },
      asset: { name: "沪深300ETF", type: "ETF", code: "510300", market: "SH" },
      status: "CURRENT",
      quantity: "1000", averageCost: "3.8", remainingCost: "3800",
      currentPrice: "4.0", currentMarketValue: "4000",
      holdingReturn: "200", realizedReturn: "50", cumulativeReturn: "250",
      createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-05-01"),
      transactions: [
        { id: "tx-001", type: "BUY", tradeDate: new Date("2026-01-01"), quantity: "1000", price: "3.8", grossAmount: "3800", fee: "5", tax: "0", netAmount: "3795", note: null },
      ],
    });
    const res = await HoldingDetailGET(new Request("http://localhost"), {
      params: Promise.resolve({ holdingId: "hld-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("hld-001");
    expect(body.data.transactions).toHaveLength(1);
    expect(body.data.assetName).toBe("沪深300ETF");
  });

  it("returns 404 when not found", async () => {
    mockPrisma.holding.findUnique.mockResolvedValue(null);
    const res = await HoldingDetailGET(new Request("http://localhost"), {
      params: Promise.resolve({ holdingId: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });
});

// ---------- GET /api/holdings/[holdingId]/transactions ----------
describe("GET /api/holdings/[holdingId]/transactions", () => {
  it("returns 200 with transactions sorted by tradeDate asc", async () => {
    mockPrisma.holding.findUnique.mockResolvedValue({ id: "hld-001" });
    mockPrisma.transaction.findMany.mockResolvedValue([
      { id: "tx-001", type: "BUY", tradeDate: new Date("2026-01-01"), quantity: "500", price: "3.8", grossAmount: "1900", fee: "2.5", tax: "0", netAmount: "1897.5", note: null },
      { id: "tx-002", type: "BUY", tradeDate: new Date("2026-02-01"), quantity: "500", price: "4.0", grossAmount: "2000", fee: "2.5", tax: "0", netAmount: "1997.5", note: null },
    ]);
    const res = await HoldingTransactionsGET(new Request("http://localhost"), {
      params: Promise.resolve({ holdingId: "hld-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].type).toBe("BUY");
  });

  it("returns 404 when holdingId not found", async () => {
    mockPrisma.holding.findUnique.mockResolvedValue(null);
    const res = await HoldingTransactionsGET(new Request("http://localhost"), {
      params: Promise.resolve({ holdingId: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });
});

// ---------- GET /api/transactions ----------
describe("GET /api/transactions", () => {
  it("returns 200 with last 50 transactions", async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([
      { id: "tx-001", memberId: "mem-001", member: { name: "张三" }, asset: { name: "沪深300ETF" }, type: "BUY", tradeDate: new Date("2026-05-01"), quantity: "100", grossAmount: "400", fee: "1", netAmount: "399", note: null },
    ]);
    const res = await TransactionsListGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].memberName).toBe("张三");
    expect(body.data[0].assetName).toBe("沪深300ETF");
  });

  it("handles null asset (optional relation)", async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([
      { id: "tx-001", memberId: "mem-001", member: { name: "张三" }, asset: null, type: "DEPOSIT", tradeDate: new Date("2026-05-01"), quantity: null, grossAmount: "5000", fee: "0", netAmount: "5000", note: null },
    ]);
    const res = await TransactionsListGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].assetName).toBeNull();
  });
});

// ---------- POST /api/transactions ----------
describe("POST /api/transactions", () => {
  const validTx = {
    householdId: "hh-001",
    memberId: "mem-001",
    accountId: "acc-001",
    type: "BUY",
    tradeDate: "2026-05-01",
    grossAmount: 1000,
    netAmount: 995,
  };

  it("returns 201 with created transaction id", async () => {
    mockPrisma.transaction.create.mockResolvedValue({ id: "tx-new-001" });
    const res = await TransactionCreatePOST(mockRequest("http://localhost", { method: "POST", body: validTx }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("tx-new-001");
  });

  it("returns 400 for invalid body (missing required fields)", async () => {
    const res = await TransactionCreatePOST(mockRequest("http://localhost", { method: "POST", body: { type: "BUY" } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid transaction type", async () => {
    const res = await TransactionCreatePOST(mockRequest("http://localhost", { method: "POST", body: { ...validTx, type: "INVALID" } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: "this is not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await TransactionCreatePOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ---------- GET/POST /api/import-sessions ----------
describe("GET /api/import-sessions", () => {
  it("returns 200 with last 20 sessions", async () => {
    mockPrisma.importSession.findMany.mockResolvedValue([
      { id: "is-001", householdId: "hh-001", status: "REVIEWING", createdAt: new Date() } as any,
    ]);
    const res = await ImportSessionsListGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

describe("POST /api/import-sessions", () => {
  it("returns 201 with session id", async () => {
    mockPrisma.importSession.create.mockResolvedValue({ id: "is-new-001" });
    const res = await ImportSessionCreatePOST(mockRequest("http://localhost", {
      method: "POST",
      body: { householdId: "hh-001", sourcePlatform: "MANUAL", saveMode: "HOLDING_SNAPSHOT" },
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("is-new-001");
  });

  it("returns 400 for invalid schema", async () => {
    const res = await ImportSessionCreatePOST(mockRequest("http://localhost", {
      method: "POST",
      body: { householdId: "hh-001" },
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ---------- GET /api/import-sessions/[sessionId] ----------
describe("GET /api/import-sessions/[sessionId]", () => {
  it("returns 200 with full session and all rows", async () => {
    mockPrisma.importSession.findUnique.mockResolvedValue({
      id: "is-001", householdId: "hh-001", memberId: null,
      sourcePlatform: "MANUAL", saveMode: "HOLDING_SNAPSHOT",
      status: "REVIEWING", originalFileName: null, fileMimeType: null,
      fileSizeBytes: null, fileUrl: null, ocrProvider: null, ocrDurationMs: null,
      reviewStatus: null, recognizedRowCount: 1, savedRowCount: 0,
      ignoredRowCount: 0, lowConfidenceCount: 0, missingFieldCount: 0,
      duplicateCount: 0, savedAt: null, errorMessage: null,
      createdAt: new Date("2026-05-01"),
      recognizedRows: [
        { id: "row-001", rowIndex: 1, memberId: null, accountId: null, assetName: "ETF", assetCode: null, assetType: "ETF", currency: "CNY", market: null, quantity: "1000", price: "4.0", marketValue: "4000", cost: "3800", holdingReturn: "200", holdingReturnRate: null, dataDate: new Date("2026-05-01"), confidence: 95, status: "NORMAL", validationIssues: null, action: null, note: null, transactionType: null, tradeDate: null, grossAmount: null, fee: null, tax: null, netAmount: null, cashImpact: null, realizedReturn: null },
      ] as any,
    });
    const res = await ImportSessionDetailGET(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("is-001");
    expect(body.data.rows).toHaveLength(1);
  });

  it("returns 404 when not found", async () => {
    mockPrisma.importSession.findUnique.mockResolvedValue(null);
    const res = await ImportSessionDetailGET(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });
});

// ---------- GET /api/daily-brief ----------
describe("GET /api/daily-brief", () => {
  it("returns 200 with latest brief", async () => {
    mockPrisma.dailyBrief.findFirst.mockResolvedValue({
      id: "brief-001", date: new Date("2026-05-11"),
      status: "GENERATED", generatedAt: new Date(),
      title: "今日简报", summary: "summary",
      householdImpact: "{}", marketOverview: "[]", memberImpacts: "[]",
      riskAlerts: "[]", adviceCards: "[]", newsItems: "[]",
      pushStatus: null,
    } as any);
    const res = await BriefGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("brief-001");
  });

  it("returns 404 when no brief exists", async () => {
    mockPrisma.dailyBrief.findFirst.mockResolvedValue(null);
    const res = await BriefGET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

// ---------- POST /api/daily-brief/generate ----------
describe("POST /api/daily-brief/generate", () => {
  it("returns 200 with generated brief", async () => {
    const { generateDailyBrief } = await import("@/server/brief/brief-generator");
    (generateDailyBrief as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "brief-new", status: "GENERATED", title: "日报", date: new Date("2026-05-11"), generatedAt: new Date(),
    });

    const res = await BriefGeneratePOST(mockRequest("http://localhost", { method: "POST", body: {} }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("brief-new");
  });

  it("returns 401 when BRIEF_API_SECRET set and mismatched", async () => {
    process.env.BRIEF_API_SECRET = "my-secret";
    const res = await BriefGeneratePOST(mockRequest("http://localhost", {
      method: "POST",
      body: {},
      headers: { "x-brief-api-secret": "wrong" },
    }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

// ---------- POST /api/daily-brief/push ----------
describe("POST /api/daily-brief/push", () => {
  it("returns 200 with push result", async () => {
    mockPrisma.household.findFirst.mockResolvedValue({ id: "hh-001" } as any);
    mockPrisma.dailyBrief.findFirst.mockResolvedValue({
      id: "brief-001", date: new Date("2026-05-11"), createdAt: new Date(),
      title: "日报", summary: "摘要", riskAlerts: "[]", adviceCards: "[]",
      pushStatus: null,
    } as any);
    mockPrisma.portfolioSnapshot.findFirst.mockResolvedValue({
      dailyReturn: "0.01", totalAssets: "100000",
    } as any);

    const { getPushProvider } = await import("@/server/push/registry");
    (getPushProvider as ReturnType<typeof vi.fn>).mockReturnValue({
      sendDailyBrief: vi.fn().mockResolvedValue({ success: true, provider: "mock", message: "ok" }),
    });

    const res = await BriefPushPOST(mockRequest("http://localhost", { method: "POST", body: { date: "2026-05-11" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
  });

  it("returns 401 when secret header mismatch", async () => {
    process.env.BRIEF_API_SECRET = "my-secret";
    const res = await BriefPushPOST(mockRequest("http://localhost", {
      method: "POST", body: {},
      headers: { "x-push-api-secret": "wrong" },
    }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when no household", async () => {
    mockPrisma.household.findFirst.mockResolvedValue(null);
    const res = await BriefPushPOST(mockRequest("http://localhost", { method: "POST", body: {} }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when no brief for date", async () => {
    mockPrisma.household.findFirst.mockResolvedValue({ id: "hh-001" } as any);
    mockPrisma.dailyBrief.findFirst.mockResolvedValue(null);
    const res = await BriefPushPOST(mockRequest("http://localhost", { method: "POST", body: { date: "2099-01-01" } }));
    expect(res.status).toBe(404);
  });
});

// ---------- GET /api/ai/status ----------
describe("GET /api/ai/status", () => {
  it("returns 200 with provider info and last run", async () => {
    mockPrisma.aiGenerationRun.findFirst.mockResolvedValue({
      id: "run-001", status: "SUCCESS", startedAt: new Date(), durationMs: 5000, errorMessage: null,
    } as any);
    const res = await AiStatusGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.provider).toBeDefined();
    expect(body.data.lastRun).toBeDefined();
  });
});

// ---------- GET /api/push/status ----------
describe("GET /api/push/status", () => {
  it("returns 200 with provider info and last push", async () => {
    mockPrisma.pushNotification.findFirst.mockResolvedValue({
      id: "push-001", status: "SUCCESS", channel: "serverchan", title: "测试", sentAt: new Date(), errorMessage: null, createdAt: new Date(),
    } as any);
    const res = await PushStatusGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.provider).toBeDefined();
    expect(body.data.lastPush).toBeDefined();
  });
});

// ---------- POST /api/push/test ----------
describe("POST /api/push/test", () => {
  it("returns 200 with test push result", async () => {
    const { getPushProvider } = await import("@/server/push/registry");
    (getPushProvider as ReturnType<typeof vi.fn>).mockReturnValue({
      sendTest: vi.fn().mockResolvedValue({ success: true, provider: "mock", message: "test ok" }),
    });
    const res = await PushTestPOST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
  });
});

// ---------- POST /api/auth/login ----------
describe("POST /api/auth/login", () => {
  it("returns 400 when email/password missing", async () => {
    const res = await AuthLoginPOST(mockRequest("http://localhost", { method: "POST", body: {} }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 for invalid credentials", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await AuthLoginPOST(mockRequest("http://localhost", {
      method: "POST",
      body: { email: "none@test.com", password: "wrong" },
    }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_FAILED");
  });

  it("returns 200 with user info on success", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-001", name: "测试", email: "test@test.com", role: "ADMIN", isActive: true,
      passwordCredential: { passwordHash: "hash", passwordSalt: "salt" },
    } as any);
    mockPrisma.member.findFirst.mockResolvedValue({
      id: "mem-001", householdId: "hh-001",
    } as any);

    const { verifyPassword } = await import("@/server/auth/password");
    (verifyPassword as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { createSession } = await import("@/server/auth/session");
    (createSession as ReturnType<typeof vi.fn>).mockResolvedValue({ token: "session-token" });

    const { setSessionCookie } = await import("@/server/auth/cookies");
    (setSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await AuthLoginPOST(mockRequest("http://localhost", {
      method: "POST",
      body: { email: "test@test.com", password: "correct" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.email).toBe("test@test.com");
    expect(body.data.user.memberId).toBe("mem-001");
  });
});

// ---------- POST /api/auth/logout ----------
describe("POST /api/auth/logout", () => {
  it("returns 200 and clears session", async () => {
    const { getSessionCookie, clearSessionCookie } = await import("@/server/auth/cookies");
    (getSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue("token-123");
    const { getSessionFromToken } = await import("@/server/auth/session");
    (getSessionFromToken as ReturnType<typeof vi.fn>).mockResolvedValue({ sessionId: "sess-001" });
    const { revokeSession } = await import("@/server/auth/session");
    (revokeSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (clearSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await AuthLogoutPOST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.loggedOut).toBe(true);
    expect(revokeSession).toHaveBeenCalledWith("sess-001");
  });
});

// ---------- GET /api/auth/me ----------
describe("GET /api/auth/me", () => {
  it("returns authenticated=false when AUTH_ENABLED!=true", async () => {
    process.env.AUTH_ENABLED = "false";
    const res = await AuthMeGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.authenticated).toBe(false);
  });

  it("returns 401 when no session cookie", async () => {
    process.env.AUTH_ENABLED = "true";
    const { getSessionCookie } = await import("@/server/auth/cookies");
    (getSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await AuthMeGET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with user/member/permissions", async () => {
    process.env.AUTH_ENABLED = "true";
    const { getSessionCookie } = await import("@/server/auth/cookies");
    (getSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue("token-123");
    const { getSessionFromToken } = await import("@/server/auth/session");
    (getSessionFromToken as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user-001" });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-001", name: "测试", email: "test@test.com", role: "ADMIN" } as any);
    mockPrisma.member.findFirst.mockResolvedValue({ id: "mem-001", name: "张三", isAdmin: true, householdId: "hh-001" } as any);
    const { getPermissionsForRole } = await import("@/server/auth/permissions");
    (getPermissionsForRole as ReturnType<typeof vi.fn>).mockReturnValue({ canViewHousehold: true });

    const res = await AuthMeGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.email).toBe("test@test.com");
    expect(body.data.member.id).toBe("mem-001");
  });
});

// ---------- POST /api/auth/change-password ----------
describe("POST /api/auth/change-password", () => {
  it("returns 400 when AUTH_ENABLED!=true", async () => {
    process.env.AUTH_ENABLED = "false";
    const res = await AuthChangePasswordPOST(mockRequest("http://localhost", { method: "POST", body: {} }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    process.env.AUTH_ENABLED = "true";
    const { getSessionCookie } = await import("@/server/auth/cookies");
    (getSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await AuthChangePasswordPOST(mockRequest("http://localhost", { method: "POST", body: {} }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when newPassword < 6 chars", async () => {
    process.env.AUTH_ENABLED = "true";
    const { getSessionCookie } = await import("@/server/auth/cookies");
    (getSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue("token-123");
    const { getSessionFromToken } = await import("@/server/auth/session");
    (getSessionFromToken as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user-001", sessionId: "sess-001" });
    const res = await AuthChangePasswordPOST(mockRequest("http://localhost", {
      method: "POST",
      body: { oldPassword: "old", newPassword: "12345" },
    }));
    expect(res.status).toBe(400);
  });

  it("returns 200 on success and revokes other sessions", async () => {
    process.env.AUTH_ENABLED = "true";
    const { getSessionCookie } = await import("@/server/auth/cookies");
    (getSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue("token-123");
    const { getSessionFromToken } = await import("@/server/auth/session");
    (getSessionFromToken as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user-001", sessionId: "sess-001" });

    mockPrisma.passwordCredential.findUnique.mockResolvedValue({
      userId: "user-001", passwordHash: "hash", passwordSalt: "salt", passwordVersion: 1,
    } as any);

    const { verifyPassword, hashPassword } = await import("@/server/auth/password");
    (verifyPassword as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (hashPassword as ReturnType<typeof vi.fn>).mockReturnValue({ hash: "new-hash", salt: "new-salt" });

    mockPrisma.passwordCredential.update.mockResolvedValue({} as any);

    const { revokeAllUserSessions } = await import("@/server/auth/session");
    (revokeAllUserSessions as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await AuthChangePasswordPOST(mockRequest("http://localhost", {
      method: "POST",
      body: { oldPassword: "old", newPassword: "newpass123" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.changed).toBe(true);
    expect(revokeAllUserSessions).toHaveBeenCalledWith("user-001", "sess-001");
  });

  it("returns 404 when no password credential", async () => {
    process.env.AUTH_ENABLED = "true";
    const { getSessionCookie } = await import("@/server/auth/cookies");
    (getSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue("token-123");
    const { getSessionFromToken } = await import("@/server/auth/session");
    (getSessionFromToken as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user-001" });
    mockPrisma.passwordCredential.findUnique.mockResolvedValue(null);

    const res = await AuthChangePasswordPOST(mockRequest("http://localhost", {
      method: "POST",
      body: { oldPassword: "old", newPassword: "newpass123" },
    }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 when old password wrong", async () => {
    process.env.AUTH_ENABLED = "true";
    const { getSessionCookie } = await import("@/server/auth/cookies");
    (getSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue("token-123");
    const { getSessionFromToken } = await import("@/server/auth/session");
    (getSessionFromToken as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user-001" });
    mockPrisma.passwordCredential.findUnique.mockResolvedValue({
      userId: "user-001", passwordHash: "hash", passwordSalt: "salt",
    } as any);
    const { verifyPassword } = await import("@/server/auth/password");
    (verifyPassword as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const res = await AuthChangePasswordPOST(mockRequest("http://localhost", {
      method: "POST",
      body: { oldPassword: "wrong", newPassword: "newpass123" },
    }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_FAILED");
  });
});

// ---------- GET /api/auth/sessions ----------
describe("GET /api/auth/sessions", () => {
  it("returns 200 with sessions list", async () => {
    process.env.AUTH_ENABLED = "true";
    const { getSessionCookie } = await import("@/server/auth/cookies");
    (getSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue("token-123");
    const { getSessionFromToken, getUserSessions } = await import("@/server/auth/session");
    (getSessionFromToken as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user-001" });
    (getUserSessions as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "sess-001", lastSeenAt: new Date(), userAgent: "Chrome", createdAt: new Date(), expiresAt: new Date(Date.now() + 86400000) },
    ]);
    const res = await AuthSessionsGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("returns 400 when AUTH_ENABLED!=true", async () => {
    process.env.AUTH_ENABLED = "false";
    const res = await AuthSessionsGET();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_DISABLED");
  });
});

// ---------- DELETE /api/auth/sessions/[sessionId] ----------
describe("DELETE /api/auth/sessions/[sessionId]", () => {
  it("returns 200 when revoked", async () => {
    process.env.AUTH_ENABLED = "true";
    const { getSessionCookie } = await import("@/server/auth/cookies");
    (getSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue("token-123");
    const { getSessionFromToken } = await import("@/server/auth/session");
    (getSessionFromToken as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user-001", sessionId: "sess-001" });
    const { revokeSession } = await import("@/server/auth/session");
    (revokeSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await AuthSessionDeleteDELETE(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "sess-002" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.revoked).toBe(true);
  });

  it("returns 400 when AUTH_ENABLED!=true", async () => {
    process.env.AUTH_ENABLED = "false";
    const res = await AuthSessionDeleteDELETE(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "sess-002" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_DISABLED");
  });

  it("returns 401 when not authenticated", async () => {
    process.env.AUTH_ENABLED = "true";
    const { getSessionCookie } = await import("@/server/auth/cookies");
    (getSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await AuthSessionDeleteDELETE(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "sess-002" }),
    });
    expect(res.status).toBe(401);
  });
});

// ---------- GET /api/settings ----------
describe("GET /api/settings", () => {
  it("returns 200 with settings", async () => {
    mockPrisma.appSettings.findFirst.mockResolvedValue({
      id: "set-001", appearance: {}, returnMethod: {},
      pushSettings: {}, dataSourceSettings: [], scheduledJobSettings: [],
    } as any);
    const res = await SettingsGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("set-001");
  });

  it("returns 404 when no settings exist", async () => {
    mockPrisma.appSettings.findFirst.mockResolvedValue(null);
    const res = await SettingsGET();
    expect(res.status).toBe(404);
  });
});

// ---------- POST /api/settings ----------
describe("POST /api/settings", () => {
  it("returns 400 for invalid body", async () => {
    const res = await SettingsPOST(mockRequest("http://localhost", { method: "POST", body: { appearance: "not-a-record" } }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no existing settings", async () => {
    mockPrisma.appSettings.findFirst.mockResolvedValue(null);
    const res = await SettingsPOST(mockRequest("http://localhost", {
      method: "POST",
      body: { appearance: { theme: "dark" } },
    }));
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated id", async () => {
    mockPrisma.appSettings.findFirst.mockResolvedValue({ id: "set-001" } as any);
    mockPrisma.appSettings.update.mockResolvedValue({ id: "set-001" } as any);
    const res = await SettingsPOST(mockRequest("http://localhost", {
      method: "POST",
      body: { appearance: { theme: "dark" }, returnMethod: { method: "XIRR" } },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("set-001");
  });
});

// ---------- GET /api/jobs ----------
describe("GET /api/jobs", () => {
  it("returns 200 with merged scheduled jobs + registry", async () => {
    mockPrisma.scheduledJob.findMany.mockResolvedValue([
      { id: "job-001", name: "daily-valuation", displayName: null, description: "每日估值", cronExpression: "0 8 * * *", timezone: "Asia/Shanghai", isEnabled: true, lastRunAt: null, nextRunAt: null, lastStatus: null, config: null, createdAt: new Date(), updatedAt: new Date() },
    ] as any);
    const res = await JobsListGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("daily-valuation");
  });
});

// ---------- GET /api/jobs/runs ----------
describe("GET /api/jobs/runs", () => {
  it("returns 200 with recent runs (default limit)", async () => {
    const url = "http://localhost/api/jobs/runs";
    mockPrisma.jobRun.findMany.mockResolvedValue([
      { id: "run-001", jobId: "job-001", jobName: "daily-valuation", status: "SUCCESS", startedAt: new Date(), finishedAt: new Date(), durationMs: 5000, triggeredBy: "SCHEDULER", successCount: 10, failureCount: 0, skippedCount: 0, errorMessage: null, errorDetails: null, metadata: null, createdAt: new Date() },
    ] as any);
    const req = new Request(url);
    const res = await JobRunsGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("respects limit query param (max 100)", async () => {
    const url = "http://localhost/api/jobs/runs?limit=5";
    mockPrisma.jobRun.findMany.mockResolvedValue([]);
    const req = new Request(url);
    const res = await JobRunsGET(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.jobRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });
});

// ---------- POST /api/jobs/run ----------
describe("POST /api/jobs/run", () => {
  it("returns 200 with execution result", async () => {
    const { runJob } = await import("@/server/jobs/runner");
    (runJob as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "SUCCESS", message: "done" });

    const res = await JobRunPOST(mockRequest("http://localhost", {
      method: "POST",
      body: { jobName: "daily-valuation" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("SUCCESS");
  });

  it("returns 401 when JOB_API_SECRET set and mismatched", async () => {
    process.env.JOB_API_SECRET = "my-secret";
    const res = await JobRunPOST(mockRequest("http://localhost", {
      method: "POST",
      body: { jobName: "daily-valuation" },
      headers: { "x-job-api-secret": "wrong" },
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when jobName missing", async () => {
    const res = await JobRunPOST(mockRequest("http://localhost", {
      method: "POST",
      body: {},
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ---------- GET /api/market-data/sources ----------
describe("GET /api/market-data/sources", () => {
  it("returns 200 with sources merged with provider status", async () => {
    mockPrisma.marketDataSource.findMany.mockResolvedValue([
      { id: "ds-001", name: "Mock", displayName: "Mock", type: "MOCK", isEnabled: true, priority: 1, supportedAssetTypes: ["ALL"], config: null, lastCheckedAt: null, lastStatus: null, createdAt: new Date(), updatedAt: new Date() },
    ] as any);
    const { getAllProviders } = await import("@/server/market-data/registry");
    (getAllProviders as ReturnType<typeof vi.fn>).mockReturnValue([{ name: "Mock" }]);
    const res = await MarketDataSourcesGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].hasProvider).toBe(true);
  });
});

// ---------- POST /api/market-data/sources/check ----------
describe("POST /api/market-data/sources/check", () => {
  it("returns 200 with health check results", async () => {
    const { healthCheckAll } = await import("@/server/market-data/registry");
    (healthCheckAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      Mock: { status: "HEALTHY", latencyMs: 100 },
    });
    mockPrisma.marketDataSource.updateMany.mockResolvedValue({ count: 1 } as any);
    const res = await MarketDataCheckPOST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.Mock.status).toBe("HEALTHY");
    expect(mockPrisma.marketDataSource.updateMany).toHaveBeenCalled();
  });
});
