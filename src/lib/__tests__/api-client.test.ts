import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock environment before importing
vi.mock("@/lib/api/api-client", async () => {
  // We will only test the api object's request method behavior through the exported api
  const actual = await vi.importActual("@/lib/api/api-client");
  return actual;
});

describe("api-client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("exports USE_API_DATA boolean", async () => {
    const { USE_API_DATA } = await import("@/lib/api/api-client");
    expect(typeof USE_API_DATA).toBe("boolean");
  });

  it("makes GET request and returns data on success", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve({ ok: true, data: { status: "ok", timestamp: "2026-04-28" } }),
    });

    const { api } = await import("@/lib/api/api-client");
    const result = await api.health();
    expect(result).toEqual({ status: "ok", timestamp: "2026-04-28" });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/health"),
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("throws on non-ok response", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve({ ok: false, error: { code: "NOT_FOUND", message: "Resource not found" } }),
    });

    const { api } = await import("@/lib/api/api-client");
    await expect(api.health()).rejects.toThrow("Resource not found");
  });

  it("handles network errors", async () => {
    (global.fetch as any).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { api } = await import("@/lib/api/api-client");
    await expect(api.health()).rejects.toThrow("Failed to fetch");
  });

  it("calls correct paths for each method", async () => {
    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true, data: {} }),
    });

    const { api } = await import("@/lib/api/api-client");

    await api.members();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/members"), expect.any(Object));

    await api.member("member-1");
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/members/member-1"), expect.any(Object));

    await api.holdings();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/holdings"), expect.any(Object));

    await api.holding("h-1");
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/holdings/h-1"), expect.any(Object));
  });

  it("makes POST request for runJob", async () => {
    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true, data: { status: "success", successCount: 5, failureCount: 0, skippedCount: 0 } }),
    });

    const { api } = await import("@/lib/api/api-client");
    const result = await api.runJob("update-market-prices", "2026-04-28");
    expect(result.status).toBe("success");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/jobs/run"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ jobName: "update-market-prices", date: "2026-04-28" }),
      }),
    );
  });

  it("uses FormData for uploadImportFile", async () => {
    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true, data: { fileName: "test.png", mimeType: "image/png", sizeBytes: 1024 } }),
    });

    const { api } = await import("@/lib/api/api-client");
    const file = new File(["test"], "test.png", { type: "image/png" });
    const result = await api.uploadImportFile("session-1", file);
    expect(result.fileName).toBe("test.png");
    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toContain("/api/import-sessions/session-1/upload");
    expect(fetchCall[1].body).toBeInstanceOf(FormData);
    expect(fetchCall[1].method).toBe("POST");
  });

  it("throws on failed upload", async () => {
    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: false, error: { message: "File too large" } }),
    });

    const { api } = await import("@/lib/api/api-client");
    const file = new File(["test"], "test.png", { type: "image/png" });
    await expect(api.uploadImportFile("session-1", file)).rejects.toThrow("File too large");
  });

  it("sends POST for checkMarketDataSources", async () => {
    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ok: true, data: { "sina": { status: "HEALTHY", checkedAt: "2026-04-28", latencyMs: 120 } } }),
    });

    const { api } = await import("@/lib/api/api-client");
    const result = await api.checkMarketDataSources();
    expect(result.sina.status).toBe("HEALTHY");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/market-data/sources/check"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
