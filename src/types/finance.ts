export type AssetType =
  | "cash"
  | "aShare"
  | "usStock"
  | "etf"
  | "mutualFund"
  | "bankWealth"
  | "gold";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash: "现金",
  aShare: "A股",
  usStock: "美股",
  etf: "场内基金",
  mutualFund: "场外基金",
  bankWealth: "银行理财",
  gold: "黄金积存金",
};

export type TransactionType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "INTEREST"
  | "DEPOSIT"
  | "WITHDRAW"
  | "FEE"
  | "ADJUSTMENT";

export interface Transaction {
  id: string;
  memberId: string;
  accountId: string;
  assetId: string;
  type: TransactionType;
  date: string;
  quantity?: number;
  price?: number;
  amount: number;
  fee?: number;
  tax?: number;
  note?: string;
}

export interface Holding {
  id: string;
  memberId: string;
  accountId: string;
  assetId: string;
  assetName: string;
  assetType: AssetType;
  currency: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  holdingReturn: number;
  holdingReturnRate: number | null;
  realizedReturn: number;
  cumulativeReturn: number;
  cumulativeReturnRate: number | null;
  costBasis: number;
  weight: number;
  riskTag?: string;
  isCleared?: boolean;
}

export interface Member {
  id: string;
  name: string;
  avatar?: string;
  totalAssets: number;
  cashBalance: number;
  holdingReturn: number;
  realizedReturn: number;
  cumulativeReturn: number;
  cumulativeReturnRate: number | null;
  holdings: Holding[];
  accounts: Account[];
}

export interface Account {
  id: string;
  memberId: string;
  name: string;
  platform: string;
  cashBalance: number;
}

export interface Household {
  totalAssets: number;
  cashBalance: number;
  todayReturn: number;
  holdingReturn: number;
  holdingReturnRate: number | null;
  realizedReturn: number;
  cumulativeReturn: number;
  cumulativeReturnRate: number | null;
  members: Member[];
}

export interface DailyReturn {
  date: string;
  value: number;
}

export interface MonthlyAsset {
  month: string;
  value: number;
}

export interface AssetAllocation {
  type: AssetType;
  value: number;
  percentage: number;
}

export interface MemberAllocation {
  memberId: string;
  memberName: string;
  value: number;
  percentage: number;
}

export interface RiskAlert {
  id: string;
  type: "warning" | "danger" | "info";
  title: string;
  description: string;
  relatedAsset?: string;
}

export interface DailyBrief {
  date: string;
  summary: string;
  hasNew: boolean;
}

export interface HoldingRankItem {
  holdingId: string;
  assetName: string;
  assetType: AssetType;
  memberName: string;
  return_value: number;
  returnRate: number | null;
}

export interface MemberReturn {
  memberId: string;
  memberName: string;
  holdingReturn: number;
  realizedReturn: number;
  cumulativeReturn: number;
  cumulativeReturnRate: number | null;
}

export interface InvestorPhilosophy {
  memberId: string;
  riskPreference: string;
  investmentHorizon: string;
  mainGoal: string;
  maxSingleAssetRatio: number;
  maxSingleIndustryRatio: number;
  cashReserveRequirement: number;
  preferredAssets: string[];
  avoidBehaviors: string[];
  tradingFrequency: string;
  aiAdviceStyle: string;
}

export interface PricePoint {
  date: string;
  price: number;
  nav?: number;
}

export interface TradeMarker {
  date: string;
  type: "BUY" | "SELL" | "DIVIDEND";
  quantity: number;
  price: number;
  amount: number;
}

export interface PositionNewsItem {
  id: string;
  date: string;
  title: string;
  summary: string;
  source: string;
  impact: "positive" | "negative" | "neutral";
  importance: "high" | "medium" | "low";
}

export interface PositionAdvice {
  type: string;
  reason: string;
  riskLevel: "low" | "medium" | "high";
  triggerCondition: string;
  uncertainty: string;
  philosophyMatch: string;
}

export interface AccountSummary {
  id: string;
  name: string;
  platform: string;
  totalValue: number;
  cashBalance: number;
  holdingReturn: number;
  realizedReturn: number;
  cumulativeReturn: number;
  holdingCount: number;
}

export interface TransactionLifecycle extends Transaction {
  postQuantity: number;
  postCostBasis: number;
  realizedGain?: number;
}

export interface ClearedHoldingSummary {
  id: string;
  memberId: string;
  accountId: string;
  assetName: string;
  assetType: AssetType;
  totalInvested: number;
  totalReturned: number;
  realizedReturn: number;
  returnRate: number | null;
  clearedDate: string;
}

export interface ReturnBreakdown {
  holdingReturn: number;
  tradingRealized: number;
  dividendInterest: number;
  feesTaxes: number;
  cumulativeReturn: number;
}
