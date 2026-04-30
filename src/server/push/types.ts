import type { AiBriefOutput } from "../ai/types";

export interface PushDailyBriefInput {
  title: string;
  summary: string;
  dailyReturn: number;
  riskAlerts: { level: string; type: string; description: string }[];
  adviceCards: { adviceType: string; relatedMember: string; relatedAssetName: string; reason: string }[];
  includeTotalAssets: boolean;
  includeMemberDetails: boolean;
  includeAiAdvice: boolean;
  onlyHighRisk: boolean;
  totalAssets?: number;
}

export interface PushResult {
  success: boolean;
  provider: string;
  message: string;
  sentAt: string;
}

export interface PushProviderHealth {
  status: "HEALTHY" | "DEGRADED" | "FAILED" | "DISABLED";
  message?: string;
  checkedAt: string;
}

export interface PushProvider {
  name: string;
  isEnabled(): boolean | Promise<boolean>;
  sendDailyBrief(input: PushDailyBriefInput): Promise<PushResult>;
  sendTest?(): Promise<PushResult>;
  healthCheck?(): Promise<PushProviderHealth>;
}
