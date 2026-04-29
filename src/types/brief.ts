export type BriefStatus = "generated" | "generating" | "failed" | "pushed";
export const BRIEF_STATUS_LABELS: Record<BriefStatus, string> = {
  generated: "已生成", generating: "生成中", failed: "生成失败", pushed: "已推送",
};

export type MarketDirection = "positive" | "negative" | "neutral" | "volatile";
export const MARKET_DIRECTION_LABELS: Record<MarketDirection, string> = {
  positive: "偏积极", negative: "偏负面", neutral: "中性", volatile: "波动加大",
};

export type ImpactDirection = "positive" | "negative" | "neutral" | "uncertain";
export const IMPACT_LABELS: Record<ImpactDirection, string> = {
  positive: "正面", negative: "负面", neutral: "中性", uncertain: "不确定",
};

export type ImportanceLevel = "high" | "medium" | "low";
export const IMPORTANCE_LABELS: Record<ImportanceLevel, string> = {
  high: "重要", medium: "一般", low: "参考",
};

export type AdviceType =
  | "继续观察" | "分批加仓" | "减仓观察" | "止盈评估"
  | "降低集中度" | "补充现金" | "暂不操作" | "等待确认信号";

export type AdviceIntensity = "low" | "medium" | "high";

export type RiskType =
  | "仓位集中" | "短期波动" | "行业集中" | "汇率风险"
  | "流动性风险" | "估值风险" | "利率风险" | "信息不确定";

export type PushChannel = "wecom_robot" | "server_chan" | "wechat" | "disabled";

export interface MarketOverviewItem {
  id: string;
  market: string;
  direction: MarketDirection;
  importance: ImportanceLevel;
  summary: string;
  affectedAssetTypes: string[];
}

export interface HouseholdImpactSummary {
  direction: ImpactDirection;
  todayReturn: number;
  todayReturnRate: number | null;
  topPositiveAsset: string;
  topNegativeAsset: string;
  topAffectedMember: string;
  riskKeywords: string[];
}

export interface MemberImpactSummary {
  memberId: string;
  memberName: string;
  todayReturn: number;
  affectedHoldingCount: number;
  mainAffectedAssets: string[];
  philosophyMatch: string;
  riskAlert: string;
  adviceSummary: string;
}

export interface BriefNewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  category: string;
  relatedAssets: string[];
  relatedMembers: string[];
  impact: ImpactDirection;
  importance: ImportanceLevel;
  summary: string;
  aiInterpretation: string;
}

export interface BriefRiskAlert {
  id: string;
  level: "low" | "medium" | "high";
  type: RiskType;
  relatedMember: string;
  relatedHolding: string;
  description: string;
  suggestWatch: string;
  triggerCondition: string;
}

export interface AdviceCardData {
  id: string;
  type: AdviceType;
  relatedMember: string;
  relatedAsset: string;
  reason: string;
  riskLevel: "low" | "medium" | "high";
  triggerCondition: string;
  uncertainty: string;
  philosophyMatch: string;
  observePeriod: string;
  intensity: AdviceIntensity;
}

export interface WeChatPushStatus {
  pushed: boolean;
  channel: PushChannel;
  pushTime?: string;
  success?: boolean;
  failReason?: string;
}

export interface DailyBrief {
  id: string;
  date: string;
  generatedAt: string;
  status: BriefStatus;
  householdImpact: HouseholdImpactSummary;
  marketOverview: MarketOverviewItem[];
  memberImpacts: MemberImpactSummary[];
  news: BriefNewsItem[];
  riskAlerts: BriefRiskAlert[];
  adviceCards: AdviceCardData[];
  pushStatus: WeChatPushStatus;
}

export interface BriefHistoryItem {
  date: string;
  generatedAt: string;
  todayReturn: number;
  riskCount: number;
  adviceCount: number;
  pushed: boolean;
}
