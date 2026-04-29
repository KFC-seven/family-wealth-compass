import { Household, DailyReturn, MonthlyAsset, AssetAllocation, MemberAllocation, RiskAlert, DailyBrief, HoldingRankItem } from "@/types/finance";

export const mockHousehold: Household = {
  totalAssets: 1357600.0,
  cashBalance: 136980.5,
  todayReturn: 3240.5,
  holdingReturn: 24970.0,
  holdingReturnRate: 0.0215,
  realizedReturn: 13350.0,
  cumulativeReturn: 38320.0,
  cumulativeReturnRate: 0.0625,
  members: [],
};

export const mockDailyReturns: DailyReturn[] = [
  { date: "2025-03-30", value: -1250 },
  { date: "2025-03-31", value: 980 },
  { date: "2025-04-01", value: 2100 },
  { date: "2025-04-02", value: -580 },
  { date: "2025-04-03", value: 3200 },
  { date: "2025-04-04", value: -450 },
  { date: "2025-04-05", value: 1780 },
  { date: "2025-04-06", value: -320 },
  { date: "2025-04-07", value: -2100 },
  { date: "2025-04-08", value: 560 },
  { date: "2025-04-09", value: 1450 },
  { date: "2025-04-10", value: 890 },
  { date: "2025-04-11", value: -670 },
  { date: "2025-04-12", value: 2340 },
  { date: "2025-04-13", value: 0 },
  { date: "2025-04-14", value: 1100 },
  { date: "2025-04-15", value: -890 },
  { date: "2025-04-16", value: 1670 },
  { date: "2025-04-17", value: -340 },
  { date: "2025-04-18", value: 2890 },
  { date: "2025-04-19", value: 0 },
  { date: "2025-04-20", value: 450 },
  { date: "2025-04-21", value: -1200 },
  { date: "2025-04-22", value: 1980 },
  { date: "2025-04-23", value: 760 },
  { date: "2025-04-24", value: -520 },
  { date: "2025-04-25", value: 1850 },
  { date: "2025-04-26", value: 0 },
  { date: "2025-04-27", value: 1430 },
  { date: "2025-04-28", value: 3240 },
];

export const mockMonthlyAssets: MonthlyAsset[] = [
  { month: "2025-05", value: 1250000 },
  { month: "2025-06", value: 1278000 },
  { month: "2025-07", value: 1265000 },
  { month: "2025-08", value: 1292000 },
  { month: "2025-09", value: 1310000 },
  { month: "2025-10", value: 1285000 },
  { month: "2025-11", value: 1308000 },
  { month: "2025-12", value: 1326000 },
  { month: "2026-01", value: 1302000 },
  { month: "2026-02", value: 1335000 },
  { month: "2026-03", value: 1348000 },
  { month: "2026-04", value: 1357600 },
];

export const mockAssetAllocation: AssetAllocation[] = [
  { type: "aShare", value: 522800, percentage: 0.385 },
  { type: "mutualFund", value: 145910, percentage: 0.108 },
  { type: "bankWealth", value: 490520, percentage: 0.361 },
  { type: "gold", value: 239000, percentage: 0.176 },
  { type: "usStock", value: 9900, percentage: 0.007 },
  { type: "etf", value: 6360, percentage: 0.005 },
  { type: "cash", value: 100000, percentage: 0.074 },
];

export const mockMemberAllocation: MemberAllocation[] = [
  { memberId: "member-1", memberName: "爸爸", value: 856000, percentage: 0.631 },
  { memberId: "member-2", memberName: "妈妈", value: 423000, percentage: 0.311 },
  { memberId: "member-3", memberName: "孩子", value: 78600, percentage: 0.058 },
];

export const mockRiskAlerts: RiskAlert[] = [
  {
    id: "risk-1",
    type: "danger",
    title: "宁德时代跌幅较大",
    description: "爸爸持有的宁德时代浮亏¥10,800，跌幅达6.37%，已超过5%预警线。",
    relatedAsset: "宁德时代",
  },
  {
    id: "risk-2",
    type: "warning",
    title: "天弘沪深300指数A持续下跌",
    description: "妈妈持有的天弘沪深300指数A持仓浮亏6.67%，建议关注市场走势。",
    relatedAsset: "天弘沪深300指数A",
  },
  {
    id: "risk-3",
    type: "info",
    title: "A股仓位集中度高",
    description: "家庭A股资产占投资资产38.5%，贵州茅台单一持仓占比超过25%。",
  },
  {
    id: "risk-4",
    type: "warning",
    title: "积存金持仓占比偏高",
    description: "黄金类资产占家庭总资产17.6%，超过建议配置比例15%。",
    relatedAsset: "积存金",
  },
];

export const mockDailyBrief: DailyBrief = {
  date: "2026-04-28",
  summary: "A股三大指数小幅收涨，贵州茅台发布一季度财报营收同比增长8.5%。美股科技板块反弹，Apple涨1.8%。",
  hasNew: true,
};

export const mockTopGainers: HoldingRankItem[] = [
  { holdingId: "h-1", assetName: "贵州茅台", assetType: "aShare", memberName: "爸爸", return_value: 28000, returnRate: 0.0833 },
  { holdingId: "h-9", assetName: "积存金", assetType: "gold", memberName: "妈妈", return_value: 10000, returnRate: 0.0437 },
  { holdingId: "h-8", assetName: "工商银行添利宝", assetType: "bankWealth", memberName: "妈妈", return_value: 5600, returnRate: 0.02 },
  { holdingId: "h-6", assetName: "招商银行理财产品", assetType: "bankWealth", memberName: "爸爸", return_value: 3600, returnRate: 0.024 },
  { holdingId: "h-4", assetName: "易方达沪深300ETF联接A", assetType: "mutualFund", memberName: "爸爸", return_value: 1120, returnRate: 0.0986 },
];

export const mockTopLosers: HoldingRankItem[] = [
  { holdingId: "h-3", assetName: "宁德时代", assetType: "aShare", memberName: "爸爸", return_value: -10800, returnRate: -0.0637 },
  { holdingId: "h-11", assetName: "天弘沪深300指数A", assetType: "mutualFund", memberName: "妈妈", return_value: -420, returnRate: -0.0667 },
  { holdingId: "h-12", assetName: "华夏中证500ETF联接A", assetType: "etf", memberName: "孩子", return_value: -440, returnRate: -0.0647 },
];
