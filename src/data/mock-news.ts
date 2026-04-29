import { PositionNewsItem, PositionAdvice } from "@/types/finance";

export const mockPositionNews: Record<string, PositionNewsItem[]> = {
  "h-1": [
    { id: "news-1", date: "2026-04-25", title: "贵州茅台一季度营收同比增长8.5%", summary: "贵州茅台发布2026年一季度报告，实现营收同比增长8.5%，净利润增长9.2%，超出市场预期。", source: "公司公告", impact: "positive", importance: "high" },
    { id: "news-2", date: "2026-04-20", title: "白酒板块整体走强，北向资金连续加仓", summary: "近期白酒板块持续走强，北向资金连续5个交易日净流入，市场情绪回暖。", source: "财经媒体", impact: "positive", importance: "medium" },
    { id: "news-3", date: "2026-04-15", title: "贵州茅台出厂价调整预期升温", summary: "市场消息称贵州茅台可能在下半年调整出厂价，若实施将显著提升盈利能力。", source: "券商研报", impact: "positive", importance: "medium" },
  ],
  "h-3": [
    { id: "news-4", date: "2026-04-22", title: "宁德时代海外市场拓展遇阻", summary: "据报道宁德时代在欧洲某电池工厂项目面临审批延迟，可能影响海外产能布局节奏。", source: "行业媒体", impact: "negative", importance: "high" },
    { id: "news-5", date: "2026-04-18", title: "新能源车销量增速放缓，电池行业竞争加剧", summary: "一季度新能源车销量同比增长22%，增速较去年放缓。电池级碳酸锂价格持续下行。", source: "行业报告", impact: "negative", importance: "medium" },
  ],
  "h-4": [
    { id: "news-6", date: "2026-04-28", title: "沪深300指数季度调样即将生效", summary: "沪深300指数将在5月初进行季度调样，涉及多只成分股调整。", source: "指数公司", impact: "neutral", importance: "low" },
    { id: "news-7", date: "2026-04-10", title: "公募基金一季度加仓权益类资产", summary: "公募基金一季度报告显示，混合型基金整体提升了权益类资产配置比例约3个百分点。", source: "基金业协会", impact: "positive", importance: "medium" },
  ],
  "h-9": [
    { id: "news-8", date: "2026-04-26", title: "国际金价突破2400美元关口", summary: "受全球地缘政治紧张和降息预期影响，国际金价本周突破2400美元/盎司，创年内新高。", source: "路透社", impact: "positive", importance: "high" },
    { id: "news-9", date: "2026-04-20", title: "央行连续五个月增持黄金储备", summary: "中国人民银行数据显示，央行已连续五个月增持黄金储备，累计增持约30吨。", source: "央行数据", impact: "positive", importance: "high" },
  ],
  "h-12": [
    { id: "news-10", date: "2026-04-22", title: "中证500指数估值处于历史低位", summary: "当前中证500指数市盈率处于近5年15%分位以下，估值具备一定安全边际。", source: "券商研报", impact: "positive", importance: "medium" },
  ],
};

export const mockPositionAdvice: Record<string, PositionAdvice> = {
  "h-1": {
    type: "继续观察",
    reason: "贵州茅台基本面稳健，一季报超预期，当前估值处于合理区间，建议继续持有观察。",
    riskLevel: "low",
    triggerCondition: "若股价跌破1650元建议重新评估",
    uncertainty: "宏观经济复苏力度可能影响高端白酒消费",
    philosophyMatch: "与长期持有核心资产的策略高度匹配",
  },
  "h-3": {
    type: "减仓观察",
    reason: "宁德时代短期面临海外市场不确定性和行业竞争加剧，浮亏已超5%，建议适度减仓控制风险。",
    riskLevel: "high",
    triggerCondition: "若继续下跌超过10%或海外项目出现实质性进展",
    uncertainty: "海外项目审批结果和行业价格战走向存在不确定性",
    philosophyMatch: "与分散风险的投资理念基本一致，但需平衡长期看好与短期风险",
  },
  "h-4": {
    type: "分批加仓",
    reason: "沪深300估值处于合理偏低位置，该基金历史表现稳健，可以考虑在市场回调时分批加仓。",
    riskLevel: "medium",
    triggerCondition: "沪深300指数跌破3700点或基金净值回撤超5%",
    uncertainty: "市场底部难以准确判断，建议分批操作",
    philosophyMatch: "与长期定投优质基金的策略高度匹配",
  },
  "h-9": {
    type: "暂不操作",
    reason: "金价处于历史高位，积存金持仓已有可观浮盈。当前不建议追高加仓，但黄金作为避险资产可继续持有。",
    riskLevel: "low",
    triggerCondition: "金价回调至2200美元以下或出现重大地缘事件",
    uncertainty: "美联储货币政策转向节奏存在不确定性",
    philosophyMatch: "与保守稳健配置黄金的理念高度匹配",
  },
  "h-12": {
    type: "继续观察",
    reason: "中证500指数估值处于历史低位，但短期市场情绪偏弱。已实现部分收益，剩余仓位可等待市场回暖。",
    riskLevel: "medium",
    triggerCondition: "指数企稳回升至6500点以上可考虑适度加仓",
    uncertainty: "中小盘股流动性和市场情绪恢复需要时间",
    philosophyMatch: "作为学习型投资，现阶段以观察和积累经验为主",
  },
};
