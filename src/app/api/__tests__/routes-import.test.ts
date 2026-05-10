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
    recognizedImportRow: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
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

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));
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
vi.mock("@/server/market-data/registry", () => ({ healthCheckAll: vi.fn(), getAllProviders: vi.fn(), safeGetPrice: vi.fn() }));

// ============================================================
// 2. ROUTE IMPORTS
// ============================================================

vi.mock("node:fs/promises", () => ({
  default: { readFile: vi.fn() },
  readFile: vi.fn(),
}));

import { POST as UploadPOST } from "@/app/api/import-sessions/[sessionId]/upload/route";
import { POST as RecognizePOST } from "@/app/api/import-sessions/[sessionId]/recognize/route";
import { POST as RowsCreatePOST } from "@/app/api/import-sessions/[sessionId]/rows/route";
import { PATCH as RowEditPATCH, DELETE as RowDeleteDELETE } from "@/app/api/import-sessions/[sessionId]/rows/[rowId]/route";
import { POST as ConfirmPOST } from "@/app/api/import-sessions/[sessionId]/confirm/route";

// Need to import side-effect tasks for jobs/run route
// Actually jobs/run route is better in a separate file due to side-effect imports.
// We'll import it separately.

// ============================================================
// 3. HELPERS
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
  delete process.env.UPLOAD_ENABLED;
  delete process.env.UPLOAD_API_SECRET;
});

// ---------- POST /api/import-sessions/[sessionId]/upload ----------
describe("POST /api/import-sessions/[sessionId]/upload", () => {
  it("returns 400 when UPLOAD_ENABLED !== true", async () => {
    const res = await UploadPOST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("UPLOAD_DISABLED");
  });

  it("no longer rejects when UPLOAD_API_SECRET is set (auth middleware protects)", async () => {
    process.env.UPLOAD_ENABLED = "true";
    process.env.UPLOAD_API_SECRET = "my-secret";
    const res = await UploadPOST(new Request("http://localhost", {
      method: "POST",
      headers: { "x-upload-api-secret": "wrong" },
    }), { params: Promise.resolve({ sessionId: "is-001" }) });
    // Secret header is no longer checked — request proceeds to file validation
    expect(res.status).toBe(404);
  });

  it("returns 404 when session not found", async () => {
    process.env.UPLOAD_ENABLED = "true";
    mockPrisma.importSession.findUnique.mockResolvedValue(null);
    const res = await UploadPOST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ sessionId: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when no file in formData", async () => {
    process.env.UPLOAD_ENABLED = "true";
    mockPrisma.importSession.findUnique.mockResolvedValue({ id: "is-001" } as any);
    // Send a FormData without the "file" field — this lets formData() succeed
    // but formData.get("file") returns null
    const fd = new FormData();
    fd.append("other", "value");
    const res = await UploadPOST(new Request("http://localhost", { method: "POST", body: fd }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid file size", async () => {
    process.env.UPLOAD_ENABLED = "true";
    mockPrisma.importSession.findUnique.mockResolvedValue({ id: "is-001" } as any);

    const { validateFileSize } = await import("@/server/storage/file-validation");
    (validateFileSize as ReturnType<typeof vi.fn>).mockReturnValue({ valid: false, message: "文件过大" });

    const formData = new FormData();
    formData.append("file", new File(["x".repeat(100)], "test.png", { type: "image/png" }));
    const res = await UploadPOST(new Request("http://localhost", { method: "POST", body: formData }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid mime type", async () => {
    process.env.UPLOAD_ENABLED = "true";
    mockPrisma.importSession.findUnique.mockResolvedValue({ id: "is-001" } as any);

    const { validateFileSize, validateMimeType } = await import("@/server/storage/file-validation");
    (validateFileSize as ReturnType<typeof vi.fn>).mockReturnValue({ valid: true });
    (validateMimeType as ReturnType<typeof vi.fn>).mockReturnValue({ valid: false, message: "不支持的文件类型" });

    const formData = new FormData();
    formData.append("file", new File(["x".repeat(100)], "test.png", { type: "image/png" }));
    const res = await UploadPOST(new Request("http://localhost", { method: "POST", body: formData }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid extension", async () => {
    process.env.UPLOAD_ENABLED = "true";
    mockPrisma.importSession.findUnique.mockResolvedValue({ id: "is-001" } as any);

    const { validateFileSize, validateMimeType, validateExtension } = await import("@/server/storage/file-validation");
    (validateFileSize as ReturnType<typeof vi.fn>).mockReturnValue({ valid: true });
    (validateMimeType as ReturnType<typeof vi.fn>).mockReturnValue({ valid: true });
    (validateExtension as ReturnType<typeof vi.fn>).mockReturnValue({ valid: false, message: "不允许的文件扩展名" });

    const formData = new FormData();
    formData.append("file", new File(["x".repeat(100)], "test.png", { type: "image/png" }));
    const res = await UploadPOST(new Request("http://localhost", { method: "POST", body: formData }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 with file metadata on success", async () => {
    process.env.UPLOAD_ENABLED = "true";
    mockPrisma.importSession.findUnique.mockResolvedValue({ id: "is-001" } as any);

    const { validateFileSize, validateMimeType, validateExtension } = await import("@/server/storage/file-validation");
    (validateFileSize as ReturnType<typeof vi.fn>).mockReturnValue({ valid: true });
    (validateMimeType as ReturnType<typeof vi.fn>).mockReturnValue({ valid: true });
    (validateExtension as ReturnType<typeof vi.fn>).mockReturnValue({ valid: true });

    const { getStorageProvider } = await import("@/server/storage/registry");
    (getStorageProvider as ReturnType<typeof vi.fn>).mockReturnValue({
      save: vi.fn().mockResolvedValue({
        originalFileName: "test.png",
        mimeType: "image/png",
        sizeBytes: 100,
        hash: "abc123",
        storageProvider: "local",
        storageKey: "/tmp/test.png",
        url: "/uploads/test.png",
      }),
    });

    mockPrisma.importSession.update.mockResolvedValue({} as any);

    const formData = new FormData();
    formData.append("file", new File(["x".repeat(100)], "test.png", { type: "image/png" }));
    const res = await UploadPOST(new Request("http://localhost", { method: "POST", body: formData }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.fileName).toBe("test.png");
    expect(mockPrisma.importSession.update).toHaveBeenCalled();
  });
});

// ---------- POST /api/import-sessions/[sessionId]/recognize ----------
describe("POST /api/import-sessions/[sessionId]/recognize", () => {
  it("returns 404 when session not found", async () => {
    mockPrisma.importSession.findUnique.mockResolvedValue(null);
    const res = await RecognizePOST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ sessionId: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when no file uploaded (no storageKey)", async () => {
    mockPrisma.importSession.findUnique.mockResolvedValue({
      id: "is-001", storageKey: null, fileMimeType: null,
    } as any);
    const res = await RecognizePOST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("NO_FILE");
  });

  it("returns 200 with recognition results on success", async () => {
    const { readFile } = await import("node:fs/promises");
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from("fake-image-data"));

    mockPrisma.importSession.findUnique.mockResolvedValue({
      id: "is-001", storageKey: "/tmp/test.png", fileMimeType: "image/png",
      sourcePlatform: "MANUAL", originalFileName: "test.png",
    } as any);

    const { getOcrProvider } = await import("@/server/ocr/registry");
    (getOcrProvider as ReturnType<typeof vi.fn>).mockReturnValue({
      recognize: vi.fn().mockResolvedValue({
        rows: [{ assetName: "ETF", assetType: "ETF", quantity: "1000", price: "4.0", confidence: 95, rawText: "raw" }],
        provider: "mock", confidence: 95, durationMs: 500, startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(), rawResult: null,
      }),
    });

    const { normalizeOcrRow } = await import("@/server/ocr/normalize");
    (normalizeOcrRow as ReturnType<typeof vi.fn>).mockImplementation((r: any) => ({
      ...r, assetName: r.assetName, assetType: r.assetType, quantity: r.quantity, price: r.price, confidence: r.confidence,
    }));

    const { validateRows } = await import("@/server/ocr/validation");
    (validateRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { row: { assetName: "ETF", assetType: "ETF", quantity: "1000", price: "4.0", confidence: 95, rawText: "raw" }, issues: [], action: "CREATE" },
    ]);

    mockPrisma.recognizedImportRow.create.mockResolvedValue({ id: "row-001" } as any);
    mockPrisma.importSession.update.mockResolvedValue({} as any);

    const res = await RecognizePOST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.rowCount).toBe(1);
    expect(mockPrisma.recognizedImportRow.create).toHaveBeenCalledTimes(1);
  });
});

// ---------- POST /api/import-sessions/[sessionId]/rows ----------
describe("POST /api/import-sessions/[sessionId]/rows", () => {
  it("returns 400 when session not found", async () => {
    mockPrisma.importSession.findUnique.mockResolvedValue(null);
    const res = await RowsCreatePOST(mockRequest("http://localhost", { method: "POST", body: { assetName: "Test" } }), {
      params: Promise.resolve({ sessionId: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when rows array empty", async () => {
    mockPrisma.importSession.findUnique.mockResolvedValue({ id: "is-001", sourcePlatform: "MANUAL" } as any);
    const res = await RowsCreatePOST(mockRequest("http://localhost", { method: "POST", body: { rows: [] } }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 201 for single row creation", async () => {
    mockPrisma.importSession.findUnique.mockResolvedValue({ id: "is-001", sourcePlatform: "MANUAL" } as any);
    mockPrisma.recognizedImportRow.findFirst.mockResolvedValue(null);
    mockPrisma.recognizedImportRow.create.mockResolvedValue({ id: "row-new-001" } as any);
    mockPrisma.importSession.update.mockResolvedValue({} as any);

    const res = await RowsCreatePOST(mockRequest("http://localhost", { method: "POST", body: { assetName: "沪深300ETF", assetType: "ETF" } }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("row-new-001");
  });

  it("returns 201 for batch rows creation", async () => {
    mockPrisma.importSession.findUnique.mockResolvedValue({ id: "is-001", sourcePlatform: "MANUAL" } as any);
    mockPrisma.recognizedImportRow.findFirst.mockResolvedValue(null);
    mockPrisma.recognizedImportRow.create
      .mockResolvedValueOnce({ id: "row-001" } as any)
      .mockResolvedValueOnce({ id: "row-002" } as any);
    mockPrisma.importSession.update.mockResolvedValue({} as any);

    const res = await RowsCreatePOST(mockRequest("http://localhost", {
      method: "POST",
      body: { rows: [{ assetName: "ETF-A", assetType: "ETF" }, { assetName: "ETF-B", assetType: "ETF" }] },
    }), { params: Promise.resolve({ sessionId: "is-001" }) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.count).toBe(2);
    expect(body.data.ids).toHaveLength(2);
  });
});

// ---------- PATCH /api/import-sessions/[sessionId]/rows/[rowId] ----------
describe("PATCH /api/import-sessions/[sessionId]/rows/[rowId]", () => {
  it("returns 404 when row not found", async () => {
    mockPrisma.recognizedImportRow.findUnique.mockResolvedValue(null);
    const res = await RowEditPATCH(mockRequest("http://localhost", { method: "PATCH", body: { assetName: "Updated" } }), {
      params: Promise.resolve({ sessionId: "is-001", rowId: "row-nonexistent" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated row id", async () => {
    mockPrisma.recognizedImportRow.findUnique.mockResolvedValue({
      id: "row-001", importSessionId: "is-001",
    } as any);
    mockPrisma.recognizedImportRow.update.mockResolvedValue({ id: "row-001" } as any);

    const res = await RowEditPATCH(mockRequest("http://localhost", { method: "PATCH", body: { assetName: "Updated ETF", quantity: "2000" } }), {
      params: Promise.resolve({ sessionId: "is-001", rowId: "row-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("row-001");
  });
});

// ---------- DELETE /api/import-sessions/[sessionId]/rows/[rowId] ----------
describe("DELETE /api/import-sessions/[sessionId]/rows/[rowId]", () => {
  it("returns 404 when row not found", async () => {
    mockPrisma.recognizedImportRow.findUnique.mockResolvedValue(null);
    const res = await RowDeleteDELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ sessionId: "is-001", rowId: "row-nonexistent" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with deleted:true", async () => {
    mockPrisma.recognizedImportRow.findUnique.mockResolvedValue({
      id: "row-001", importSessionId: "is-001",
    } as any);
    mockPrisma.recognizedImportRow.delete.mockResolvedValue({} as any);
    mockPrisma.importSession.update.mockResolvedValue({} as any);

    const res = await RowDeleteDELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ sessionId: "is-001", rowId: "row-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });
});

// ---------- POST /api/import-sessions/[sessionId]/confirm ----------
describe("POST /api/import-sessions/[sessionId]/confirm", () => {
  it("returns 404 when session not found", async () => {
    mockPrisma.importSession.findUnique.mockResolvedValue(null);
    const res = await ConfirmPOST(mockRequest("http://localhost", { method: "POST", body: {} }), {
      params: Promise.resolve({ sessionId: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });

  it("no longer rejects when UPLOAD_API_SECRET set (auth middleware protects)", async () => {
    process.env.UPLOAD_API_SECRET = "my-secret";
    mockPrisma.importSession.findUnique.mockResolvedValue({ id: "is-001", saveMode: "HOLDING_SNAPSHOT", householdId: "hh-1" } as any);
    mockPrisma.recognizedImportRow.findMany.mockResolvedValue([]);
    const res = await ConfirmPOST(mockRequest("http://localhost", {
      method: "POST", body: {},
      headers: { "x-upload-api-secret": "wrong" },
    }), { params: Promise.resolve({ sessionId: "is-001" }) });
    // Secret is no longer checked — request proceeds to save
    expect(res.status).toBe(200);
  });

  it("returns 200 with savedCount for HOLDING_SNAPSHOT mode", async () => {
    mockPrisma.importSession.findUnique.mockResolvedValue({
      id: "is-001", householdId: "hh-001", saveMode: "HOLDING_SNAPSHOT",
    } as any);
    mockPrisma.recognizedImportRow.findMany.mockResolvedValue([
      {
        id: "row-001", assetName: "ETF-1", assetType: "ETF", assetCode: "510300",
        currency: "CNY", market: "SH", memberId: "mem-001", accountId: "acc-001",
        quantity: 1000, price: 4.0, marketValue: 4000, cost: 3800,
        dataDate: new Date("2026-05-01"),
      },
    ] as any);
    mockPrisma.asset.findFirst.mockResolvedValue({
      id: "ast-001", name: "ETF-1", type: "ETF",
    } as any);
    mockPrisma.holding.findFirst.mockResolvedValue({
      id: "hld-001", remainingCost: "0", realizedReturn: "0",
    } as any);
    mockPrisma.holding.update.mockResolvedValue({} as any);
    mockPrisma.priceSnapshot.upsert.mockResolvedValue({} as any);
    mockPrisma.recognizedImportRow.count.mockResolvedValue(0);
    mockPrisma.importSession.update.mockResolvedValue({} as any);

    const res = await ConfirmPOST(mockRequest("http://localhost", { method: "POST", body: {} }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.savedCount).toBeGreaterThanOrEqual(0);
  });

  it("returns 200 with savedCount for TRANSACTION_RECORD mode", async () => {
    const { confirmTransactionRecords } = await import("@/server/import/transaction-saver");
    (confirmTransactionRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
      savedCount: 2, ignoreCount: 1, details: [{ rowId: "row-001", saved: true }],
    });

    mockPrisma.importSession.findUnique.mockResolvedValue({
      id: "is-001", householdId: "hh-001", saveMode: "TRANSACTION_RECORD",
    } as any);
    mockPrisma.recognizedImportRow.findMany.mockResolvedValue([
      { id: "row-001", action: null, status: "NORMAL", transactionType: "BUY" } as any,
      { id: "row-002", action: null, status: "NORMAL", transactionType: "SELL" } as any,
    ]);
    mockPrisma.recognizedImportRow.count.mockResolvedValue(0);
    mockPrisma.importSession.update.mockResolvedValue({} as any);

    const res = await ConfirmPOST(mockRequest("http://localhost", { method: "POST", body: { saveMode: "TRANSACTION_RECORD" } }), {
      params: Promise.resolve({ sessionId: "is-001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.savedCount).toBe(2);
    expect(body.data.ignoreCount).toBe(1);
  });
});
