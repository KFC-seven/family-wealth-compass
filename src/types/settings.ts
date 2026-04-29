export type PermissionMode = "all_view" | "custom";

export interface HouseholdSettings {
  name: string;
  defaultCurrency: string;
  permissionMode: PermissionMode;
  totalAssetsDisplay: "show" | "hide";
}

export interface MemberPermission {
  memberId: string;
  name: string;
  role: string;
  isAdmin: boolean;
  enabled: boolean;
  canView: string[];
  canEdit: string[];
}

export interface AccountSettingsItem {
  id: string;
  memberId: string;
  name: string;
  type: string;
  platform: string;
  currency: string;
  included: boolean;
  enabled: boolean;
}

export interface AssetTypeSettingsItem {
  type: string;
  label: string;
  enabled: boolean;
  color: string;
  riskLevel: string;
  dailyUpdate: boolean;
}

export interface InvestorPhilosophySettings {
  memberId: string;
  riskPreference: string;
  investmentHorizon: string;
  mainGoal: string;
  maxSingleAssetRatio: number;
  maxSingleIndustryRatio: number;
  minCashReserveMonths: number;
  preferredAssets: string[];
  avoidBehaviors: string[];
  tradingFrequency: string;
  drawdownTolerance: string;
  aiAdviceStyle: string;
  customText: string;
}

export type PushChannel = "wecom_robot" | "server_chan" | "wechat" | "disabled";

export interface WeChatPushSettings {
  enabled: boolean;
  pushTime: string;
  channel: PushChannel;
  webhookUrl: string;
  serverChanKey: string;
  includeTotalAssets: boolean;
  includeMemberDetail: boolean;
  includeAIAdvice: boolean;
  onlyHighRisk: boolean;
}

export type DataSourceStatus = "unconfigured" | "configured" | "error" | "manual";

export interface DataSourceSettingsItem {
  name: string;
  updateFrequency: string;
  status: DataSourceStatus;
  lastUpdated?: string;
}

export type JobStatus = "enabled" | "disabled";

export interface ScheduledJobSettingsItem {
  name: string;
  schedule: string;
  status: JobStatus;
  lastRun?: string;
  nextRun?: string;
}

export interface ReturnMethodSettings {
  costMethod: string;
  holdingReturnDef: string;
  realizedReturnDef: string;
  cumulativeReturnDef: string;
  periodReturnDef: string;
  cashFlowHandling: string;
  futureOptions: string[];
}

export interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  returnColorScheme: "cn_red_up" | "global_green_up";
  defaultTimeRange: string;
  defaultCurrency: string;
  decimalPlaces: number;
  privacyMode: boolean;
}
