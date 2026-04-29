# 数据库模型

## 核心实体

| 模型 | 说明 | 关键关系 |
|------|------|---------|
| User | 用户（预留登录） | 无直接业务关系 |
| Household | 家庭容器 | hasMany Member, hasOne AppSettings |
| Member | 家庭成员 | belongsTo Household, hasMany Account/Holding/Transaction |
| Account | 投资/现金账户 | belongsTo Member |
| Asset | 金融标的 | unique(type + market + code) |
| Holding | 持仓生命周期 | belongsTo Member/Account/Asset |
| Transaction | 交易记录 | belongsTo Member/Account/Asset/Holding |
| PriceSnapshot | 价格快照 | belongsTo Asset, unique(assetId + date) |
| PortfolioSnapshot | 每日汇总快照 | 按 scope 区分级别 |
| InvestorProfile | 投资理念 | belongsTo Member (一对一) |
| ImportSession | 导入会话 | hasMany RecognizedImportRow |
| DailyBrief | 每日简报 | JSON 存储结构化内容 |
| AppSettings | 家庭级配置 | JSON 存储 |

## 枚举

| 枚举 | 值 |
|------|-----|
| UserRole | OWNER / ADMIN / MEMBER / VIEWER |
| PermissionMode | ALL_VISIBLE / CUSTOM |
| AccountType | CASH / ALIPAY_FUND / BROKER / BANK / BANK_WEALTH / GOLD / OTHER |
| AssetTypeEnum | CASH / A_SHARE / US_STOCK / ETF / MUTUAL_FUND / BANK_WEALTH / GOLD_ACCUMULATION / BOND / OTHER |
| HoldingStatus | CURRENT / CLEARED / WATCHLIST |
| TransactionType | BUY / SELL / DIVIDEND / INTEREST / DEPOSIT / WITHDRAW / FEE / ADJUSTMENT |
| BriefStatus | GENERATING / GENERATED / FAILED / PUSHED |
| RiskPreference | CONSERVATIVE / STABLE / BALANCED / GROWTH / AGGRESSIVE |
| InvestmentHorizon | SHORT / MEDIUM / LONG / VERY_LONG |
| AdviceStyle | CONSERVATIVE / BALANCED / POSITIVE_WITH_CONDITIONS / ACTIVE_WITH_TRIGGERS |

## 关键设计取舍

### JSON 字段的使用
- DailyBrief、AppSettings 使用 JSON 字段
- 因为这些数据主要是整体读写，不需要对内部字段做独立查询
- 后续如果查询需求增长，可拆为独立表

### 收益字段缓存
- Holding 表的 holdingReturn/realizedReturn/cumulativeReturn 是快照缓存
- 准确值由交易记录和定时任务计算
- 已清仓持仓保留历史收益（holdingReturn=0, realizedReturn 和 cumulativeReturn 保留）

### 已清仓处理
- Holding 的 status 设为 CLEARED，quantity/marketValue/holdingReturn 为 0
- realizedReturn 和 cumulativeReturn 保留历史值

## 后续可拆表方向

- AdviceCard / RiskAlert / NewsItem 从 DailyBrief JSON 拆为独立表
- AppSettings 各配置项可拆为独立表
- 用户权限从 Member 字段发展为独立权限表
