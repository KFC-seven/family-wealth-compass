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
};
