const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export const USE_API_DATA = process.env.NEXT_PUBLIC_USE_API === "true";

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiError {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.ok) {
    throw new Error(json.error.message || `API Error: ${json.error.code}`);
  }

  return json.data;
}

export const api = {
  health: () => request<{ status: string; timestamp: string }>("/health"),

  householdSummary: () =>
    request<{
      householdId: string;
      name: string;
      totalAssets: number;
      cashBalance: number;
      memberCount: number;
    }>("/portfolio/household-summary"),

  members: () =>
    request<Array<{ id: string; name: string; roleLabel?: string; isAdmin: boolean }>>("/members"),

  member: (id: string) =>
    request<{
      id: string;
      name: string;
      accounts: Array<{ id: string; name: string; type: string }>;
      holdings: Array<{
        id: string; assetName: string; assetType: string;
        marketValue: number; holdingReturn: number; cumulativeReturn: number;
      }>;
    }>(`/members/${id}`),

  memberSummary: (id: string) =>
    request<{
      memberId: string; name: string; totalAssets: number; cashBalance: number;
      holdingReturn: number; realizedReturn: number; cumulativeReturn: number;
    }>(`/members/${id}/summary`),

  holdings: () =>
    request<Array<{
      id: string; assetName: string; assetType: string;
      marketValue: number; holdingReturn: number; cumulativeReturn: number;
    }>>("/holdings"),

  holding: (id: string) =>
    request<{
      id: string; assetName: string; assetType: string;
      quantity: number; marketValue: number;
      holdingReturn: number; realizedReturn: number; cumulativeReturn: number;
      transactions: Array<{
        id: string; type: string; tradeDate: string;
        grossAmount: number; fee: number; netAmount: number;
      }>;
    }>(`/holdings/${id}`),

  holdingTransactions: (id: string) =>
    request<Array<{
      id: string; type: string; tradeDate: string;
      grossAmount: number; netAmount: number;
    }>>(`/holdings/${id}/transactions`),

  transactions: () =>
    request<Array<{
      id: string; type: string; tradeDate: string; grossAmount: number;
    }>>("/transactions"),

  dailyBrief: () =>
    request<{
      id: string; date: string; status: string;
      householdImpact: unknown; marketOverview: unknown;
      adviceCards: unknown; newsItems: unknown;
    }>("/daily-brief"),

  settings: () =>
    request<{
      appearance: unknown; returnMethod: unknown;
      pushSettings: unknown; dataSourceSettings: unknown;
    }>("/settings"),

  // Phase 8: Jobs
  jobs: () =>
    request<Array<{
      id: string; name: string; displayName: string; description: string | null;
      cronExpression: string | null; timezone: string; isEnabled: boolean;
      lastRunAt: string | null; nextRunAt: string | null; lastStatus: string | null;
      config: unknown; createdAt: string; updatedAt: string;
    }>>("/jobs"),

  jobsRuns: (limit?: number) =>
    request<Array<{
      id: string; jobId: string | null; jobName: string; status: string;
      startedAt: string; finishedAt: string | null; durationMs: number | null;
      triggeredBy: string; successCount: number; failureCount: number;
      skippedCount: number; errorMessage: string | null; errorDetails: unknown; metadata: unknown;
    }>>(`/jobs/runs${limit ? `?limit=${limit}` : ""}`),

  runJob: (jobName: string, date?: string) =>
    request<{
      status: string; successCount: number; failureCount: number;
      skippedCount: number; errorMessage?: string; metadata?: unknown;
    }>("/jobs/run", {
      method: "POST",
      body: JSON.stringify({ jobName, date }),
    }),

  // Phase 8: Market Data Sources
  marketDataSources: () =>
    request<Array<{
      id: string; name: string; displayName: string; type: string;
      isEnabled: boolean; priority: number; supportedAssetTypes: unknown;
      config: unknown; lastCheckedAt: string | null; lastStatus: string;
      hasProvider: boolean; createdAt: string; updatedAt: string;
    }>>("/market-data/sources"),

  checkMarketDataSources: () =>
    request<Record<string, { status: string; message?: string; checkedAt: string; latencyMs?: number }>>(
      "/market-data/sources/check",
      { method: "POST" },
    ),

  // Phase 10: Import
  createImportSession: (data: { sourcePlatform: string; saveMode: string; householdId: string; memberId?: string }) =>
    request<{ id: string }>("/import-sessions", { method: "POST", body: JSON.stringify(data) }),

  uploadImportFile: async (sessionId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/import-sessions/${sessionId}/upload`, {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error?.message ?? "Upload failed");
    return json.data as { fileName: string; mimeType: string; sizeBytes: number };
  },

  recognizeImport: (sessionId: string) =>
    request<{ provider: string; rowCount: number; confidence: number; durationMs: number }>(
      `/import-sessions/${sessionId}/recognize`,
      { method: "POST" },
    ),

  getImportSession: (sessionId: string) =>
    request<{
      id: string; sourcePlatform: string; saveMode: string; status: string;
      originalFileName: string | null; recognizedRowCount: number;
      savedRowCount: number; ignoredRowCount: number;
      lowConfidenceCount: number; missingFieldCount: number; duplicateCount: number;
      savedAt: string | null; errorMessage: string | null;
      rows: Array<{
        id: string; rowIndex: number | null; memberId: string | null; accountId: string | null;
        assetName: string; assetCode: string | null; assetType: string; currency: string;
        quantity: string | null; price: string | null; marketValue: string | null;
        cost: string | null; holdingReturn: string | null; confidence: number;
        status: string; validationIssues: unknown; action: string | null; note: string | null;
      }>;
    }>(`/import-sessions/${sessionId}`),

  updateImportRow: (sessionId: string, rowId: string, data: Record<string, unknown>) =>
    request<{ id: string }>(`/import-sessions/${sessionId}/rows/${rowId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  addImportRow: (sessionId: string, data: Record<string, unknown>) =>
    request<{ id: string }>(`/import-sessions/${sessionId}/rows`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteImportRow: (sessionId: string, rowId: string) =>
    request<{ deleted: boolean }>(`/import-sessions/${sessionId}/rows/${rowId}`, {
      method: "DELETE",
    }),

  confirmImport: (sessionId: string, data: { saveMode: string; defaultTransactionType?: string }) =>
    request<{ savedCount: number; ignoreCount: number; totalRows: number }>(
      `/import-sessions/${sessionId}/confirm`,
      { method: "POST", body: JSON.stringify(data) },
    ),
};
