/** AI 生成的简报输出结构 */
export interface AiBriefOutput {
  title: string;
  summary: string;
  marketOverview: { market: string; direction: string; summary: string }[];
  householdImpact: { direction: string; summary: string; mainContributors: string[]; mainRisks: string[] };
  memberImpacts: { memberName: string; summary: string; todayReturn: number }[];
  riskAlerts: { level: string; type: string; relatedMember: string; description: string; relatedAsset?: string }[];
  adviceCards: {
    adviceType: string;
    relatedMember: string;
    relatedHoldingId?: string;
    relatedAssetName: string;
    reason: string;
    riskLevel: string;
    triggerCondition: string;
    uncertainty: string;
    philosophyMatch: string;
    observationPeriod?: string;
    actionIntensity?: string;
  }[];
  newsItems: { title: string; impact: string; importance: string; summary: string }[];
  disclaimer: string;
}

/** AI 生成输入上下文 */
export interface AiBriefInput {
  householdName: string;
  baseCurrency: string;
  date: string;
  totalAssets: number;
  dailyReturn: number;
  cumulativeReturn: number;
  holdingReturn: number;
  realizedReturn: number;
  cashBalance: number;
  members: {
    name: string;
    role: string;
    totalAssets: number;
    dailyReturn: number;
    cumulativeReturn: number;
    holdings: { name: string; type: string; marketValue: number; holdingReturn: number; cumulativeReturn: number; weight: number }[];
    philosophy: string;
    riskPreference: string;
  }[];
  riskSignals: { level: string; type: string; member: string; description: string; asset?: string }[];
  newsHighlights: { title: string; impact: string; importance: string; summary: string }[];
  marketSummary: string;
}

/** AI provider 接口 */
export interface AiProvider {
  name: string;
  isEnabled(): boolean | Promise<boolean>;
  generateStructuredBrief(input: AiBriefInput): Promise<AiBriefOutput>;
  healthCheck?(): Promise<AiProviderHealth>;
}

export interface AiProviderHealth {
  status: "HEALTHY" | "DEGRADED" | "FAILED" | "DISABLED";
  message?: string;
  checkedAt: string;
}
