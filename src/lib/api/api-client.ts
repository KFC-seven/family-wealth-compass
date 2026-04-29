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
};
