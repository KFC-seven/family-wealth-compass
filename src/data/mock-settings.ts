import {
  HouseholdSettings, MemberPermission, AccountSettingsItem,
  AssetTypeSettingsItem, InvestorPhilosophySettings, WeChatPushSettings,
  DataSourceSettingsItem, ScheduledJobSettingsItem, ReturnMethodSettings, AppearanceSettings,
} from "@/types/settings";

export const mockHouseholdSettings: HouseholdSettings = {
  name: "家庭财富罗盘", defaultCurrency: "CNY",
  permissionMode: "all_view", totalAssetsDisplay: "show",
};

export const mockMemberPermissions: MemberPermission[] = [
  { memberId: "member-1", name: "爸爸", role: "管理员", isAdmin: true, enabled: true,
    canView: ["全部"], canEdit: ["全部"] },
  { memberId: "member-2", name: "妈妈", role: "成员", isAdmin: false, enabled: true,
    canView: ["家庭总资产", "自己的明细"], canEdit: ["自己的数据"] },
  { memberId: "member-3", name: "孩子", role: "成员", isAdmin: false, enabled: true,
    canView: ["家庭总资产", "自己的明细"], canEdit: ["自己的数据"] },
];

export const mockAccountSettings: AccountSettingsItem[] = [
  { id: "acc-1", memberId: "member-1", name: "华泰证券账户", type: "券商账户", platform: "华泰证券", currency: "CNY", included: true, enabled: true },
  { id: "acc-2", memberId: "member-1", name: "支付宝基金账户", type: "支付宝基金账户", platform: "支付宝", currency: "CNY", included: true, enabled: true },
  { id: "acc-3", memberId: "member-1", name: "招商银行账户", type: "银行账户", platform: "招商银行", currency: "CNY", included: true, enabled: true },
  { id: "acc-4", memberId: "member-2", name: "工商银行理财账户", type: "银行理财账户", platform: "工商银行", currency: "CNY", included: true, enabled: true },
  { id: "acc-5", memberId: "member-2", name: "黄金积存金账户", type: "黄金积存金账户", platform: "工商银行", currency: "CNY", included: true, enabled: true },
  { id: "acc-6", memberId: "member-2", name: "支付宝基金账户", type: "支付宝基金账户", platform: "支付宝", currency: "CNY", included: true, enabled: true },
  { id: "acc-7", memberId: "member-3", name: "招商银行账户", type: "银行账户", platform: "招商银行", currency: "CNY", included: true, enabled: true },
];

export const mockAssetTypeSettings: AssetTypeSettingsItem[] = [
  { type: "cash", label: "现金", enabled: true, color: "#6b7280", riskLevel: "低", dailyUpdate: false },
  { type: "aShare", label: "A股", enabled: true, color: "#b91c1c", riskLevel: "高", dailyUpdate: true },
  { type: "usStock", label: "美股", enabled: true, color: "#2563eb", riskLevel: "高", dailyUpdate: true },
  { type: "etf", label: "场内基金", enabled: true, color: "#4f46e5", riskLevel: "中", dailyUpdate: true },
  { type: "mutualFund", label: "场外基金", enabled: true, color: "#7c3aed", riskLevel: "中", dailyUpdate: false },
  { type: "bankWealth", label: "银行理财", enabled: true, color: "#0891b2", riskLevel: "低", dailyUpdate: false },
  { type: "gold", label: "黄金积存金", enabled: true, color: "#d97706", riskLevel: "中", dailyUpdate: true },
];

export const mockInvestorPhilosophies: InvestorPhilosophySettings[] = [
  {
    memberId: "member-1", riskPreference: "平衡", investmentHorizon: "长期",
    mainGoal: "稳健增值", maxSingleAssetRatio: 30, maxSingleIndustryRatio: 40,
    minCashReserveMonths: 3, preferredAssets: ["A股核心资产", "优质基金", "理财产品"],
    avoidBehaviors: ["频繁交易", "追涨杀跌", "杠杆操作"], tradingFrequency: "低频",
    drawdownTolerance: "15%", aiAdviceStyle: "平衡", customText: "相信长期持有优质资产，不追求短期超额收益。",
  },
  {
    memberId: "member-2", riskPreference: "保守", investmentHorizon: "中长期",
    mainGoal: "保值为主", maxSingleAssetRatio: 25, maxSingleIndustryRatio: 30,
    minCashReserveMonths: 6, preferredAssets: ["银行理财", "黄金", "债券基金"],
    avoidBehaviors: ["高风险投机", "单一资产重仓", "不熟悉领域投资"], tradingFrequency: "极低频",
    drawdownTolerance: "8%", aiAdviceStyle: "保守", customText: "本金安全第一，收益在保值基础上适度增值即可。",
  },
  {
    memberId: "member-3", riskPreference: "进取", investmentHorizon: "中长期",
    mainGoal: "积累经验", maxSingleAssetRatio: 35, maxSingleIndustryRatio: 50,
    minCashReserveMonths: 2, preferredAssets: ["指数基金", "成长型基金", "科技股"],
    avoidBehaviors: ["盲目跟风", "过度集中"], tradingFrequency: "中频",
    drawdownTolerance: "20%", aiAdviceStyle: "偏积极", customText: "希望通过投资实践积累经验，愿意承担一定风险换取更高收益。",
  },
];

export const mockWeChatPushSettings: WeChatPushSettings = {
  enabled: true, pushTime: "07:30", channel: "wecom_robot",
  webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...",
  serverChanKey: "", includeTotalAssets: true, includeMemberDetail: true,
  includeAIAdvice: true, onlyHighRisk: false,
};

export const mockDataSourceSettings: DataSourceSettingsItem[] = [
  { name: "A 股行情", updateFrequency: "每日盘后", status: "unconfigured" },
  { name: "美股行情", updateFrequency: "每日盘后", status: "unconfigured" },
  { name: "场内基金行情", updateFrequency: "每日盘后", status: "unconfigured" },
  { name: "场外基金净值", updateFrequency: "每日晚间", status: "manual", lastUpdated: "2026-04-27" },
  { name: "黄金价格", updateFrequency: "实时", status: "unconfigured" },
  { name: "银行理财", updateFrequency: "手动维护", status: "manual", lastUpdated: "2026-04-25" },
  { name: "新闻源", updateFrequency: "实时", status: "unconfigured" },
  { name: "AI 模型 API", updateFrequency: "按需调用", status: "unconfigured" },
];

export const mockScheduledJobs: ScheduledJobSettingsItem[] = [
  { name: "场外基金净值更新", schedule: "每日 18:00", status: "disabled" },
  { name: "行情快照", schedule: "每日 16:00", status: "disabled" },
  { name: "收益计算", schedule: "每日 17:00", status: "disabled" },
  { name: "新闻采集", schedule: "每日 07:00", status: "disabled" },
  { name: "AI 简报生成", schedule: "每日 07:15", status: "disabled" },
  { name: "微信推送", schedule: "每日 07:30", status: "disabled" },
  { name: "周收益汇总", schedule: "每周一 08:00", status: "disabled" },
  { name: "月资产报告", schedule: "每月1日 08:00", status: "disabled" },
];

export const mockReturnMethodSettings: ReturnMethodSettings = {
  costMethod: "平均成本法",
  holdingReturnDef: "当前持仓市值 - 剩余持仓成本",
  realizedReturnDef: "卖出收益 + 分红 + 利息 - 已确认费用 / 税费",
  cumulativeReturnDef: "持仓收益 + 已实现收益",
  periodReturnDef: "期末资产 - 期初资产 - 期间净外部流入",
  cashFlowHandling: "入金增加投资本金，出金减少投资本金，均不计入收益",
  futureOptions: ["FIFO 成本法", "XIRR 内部收益率", "时间加权收益率 TWR"],
};

export const mockAppearanceSettings: AppearanceSettings = {
  theme: "system", returnColorScheme: "cn_red_up",
  defaultTimeRange: "近30日", defaultCurrency: "CNY",
  decimalPlaces: 2, privacyMode: false,
};
