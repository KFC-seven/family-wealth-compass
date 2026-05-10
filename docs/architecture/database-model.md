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
| RecognizedImportRow | **统一导入中间行** | belongsTo ImportSession |
| DailyBrief | 每日简报 | JSON 存储结构化内容 |
| ScheduledJob | 定时任务配置 | hasMany JobRun |
| JobRun | 任务执行记录 | belongsTo ScheduledJob (optional) |
| MarketDataSource | 行情数据源配置 | 独立实体 |
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
| ImportSourcePlatform | ALIPAY / BROKER / BANK / OTHER / MANUAL / BATCH_PASTE |
| ImportSaveMode | HOLDING_SNAPSHOT / TRANSACTION_RECORD |
| ImportSessionStatus | UPLOADED / RECOGNIZING / REVIEWING / SAVED / FAILED |
| RecognitionRowStatus | NORMAL / LOW_CONFIDENCE / MISSING_FIELDS / DUPLICATE / IGNORED / CONFIRMED |
| BriefStatus | GENERATING / GENERATED / FAILED / PUSHED |
| RiskPreference | CONSERVATIVE / STABLE / BALANCED / GROWTH / AGGRESSIVE |
| InvestmentHorizon | SHORT / MEDIUM / LONG / VERY_LONG |
| AdviceStyle | CONSERVATIVE / BALANCED / POSITIVE_WITH_CONDITIONS / ACTIVE_WITH_TRIGGERS |
| JobStatus | RUNNING / SUCCESS / FAILED / PARTIAL / SKIPPED |
| JobTrigger | MANUAL / SCHEDULER / API / SYSTEM |
| MarketDataSourceType | MOCK / MANUAL / EASTMONEY / TUSHARE / AKSHARE_HTTP / OTHER |
| MarketDataSourceStatus | HEALTHY / DEGRADED / FAILED / DISABLED |

## ImportSession — 统一导入会话 (Phase 10 + Phase 18)

ImportSession 是导入流程的容器，不区分截图 OCR 和手动录入。

| 字段 | 类型 | 说明 |
|------|------|------|
| sourcePlatform | ImportSourcePlatform | 来源：ALIPAY/BROKER/BANK/OTHER/MANUAL/BATCH_PASTE |
| saveMode | ImportSaveMode | 保存模式：HOLDING_SNAPSHOT 或 TRANSACTION_RECORD |

**sourcePlatform 说明**：
- `ALIPAY/BROKER/BANK/OTHER` — 截图 OCR 导入来源
- `MANUAL` — 手动录入（持仓或交易），无需截图/OCR
- `BATCH_PASTE` — 批量粘贴导入，无需截图/OCR

**saveMode 说明**：
- `HOLDING_SNAPSHOT` — 保存为当前持仓快照，更新 Asset/Holding/PriceSnapshot
- `TRANSACTION_RECORD` — 保存为交易记录，创建 Transaction 并联动 Holding

## RecognizedImportRow — 统一导入中间行 (Phase 10 + Phase 18)

RecognizedImportRow 是导入流程中的中间行数据。不仅代表 OCR 识别结果，也可以代表手动录入行或批量粘贴行。

### OCR 识别字段（Phase 10 已有）

| 字段 | 类型 | 说明 |
|------|------|------|
| rowIndex | Int? | 行号 |
| sourcePlatform | ImportSourcePlatform | 来源平台 |
| memberId | String? | 成员 ID |
| accountId | String? | 账户 ID |
| assetName | String @default("") | 资产名称 |
| assetCode | String? | 资产代码 |
| assetType | String @default("OTHER") | 资产类型 |
| currency | String @default("CNY") | 币种 |
| quantity | Decimal? | 数量 |
| price | Decimal? | 价格/净值 |
| marketValue | Decimal? | 当前市值 |
| cost | Decimal? | 持仓成本/剩余成本 |
| holdingReturn | Decimal? | 持仓收益 |
| holdingReturnRate | Decimal? | 持仓收益率 |
| dataDate | DateTime? | 数据日期 |
| confidence | Int @default(0) | OCR 置信度 (0-100)；手动行为 100 |
| status | RecognitionRowStatus | 行状态 |
| rawText | String? | OCR 原始文本 |
| normalizedText | String? | 标准化后文本 |
| fieldConfidences | Json? | 各字段置信度 |
| validationIssues | Json? | 校验问题列表 |
| action | String? | MANUAL / SAVE / IGNORE |
| confirmedAt | DateTime? | 确认时间 |
| note | String? | 备注 |

### 交易字段（Phase 18 新增）

用于手动录入交易和批量粘贴交易场景。OCR 导入行不使用这些字段。

| 字段 | 类型 | 说明 | 适用交易类型 |
|------|------|------|------------|
| market | String? | 市场（A股/港股/美股） | BUY, SELL |
| transactionType | String? | 交易类型枚举名 | 所有交易类型 |
| tradeDate | DateTime? | 交易日期 | 所有交易类型 |
| grossAmount | Decimal? | 成交金额 | 所有交易类型 |
| fee | Decimal? | 费用 | BUY, SELL |
| tax | Decimal? | 税费 | BUY, SELL |
| netAmount | Decimal? | 净额 | 所有交易类型 |
| cashImpact | Decimal? | 现金影响（+流入 / -流出） | 所有交易类型 |
| realizedReturn | Decimal? | 已实现收益 | SELL, DIVIDEND, INTEREST, FEE |

### sourcePlatform 与字段使用关系

| sourcePlatform | 使用字段组 | confidence | action |
|------|-----------|-----------|--------|
| ALIPAY/BROKER/BANK/OTHER | OCR 识别字段 | OCR 识别值 | 默认 SAVE |
| MANUAL (saveMode=HOLDING_SNAPSHOT) | OCR 识别字段（全部手动填写） | 100 | MANUAL |
| MANUAL (saveMode=TRANSACTION_RECORD) | 交易字段 + 资产字段 | 100 | MANUAL |
| BATCH_PASTE | 同 MANUAL，由粘贴解析 | 100 | MANUAL |

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

### 统一导入中间行
- RecognizedImportRow 不区分来源（OCR/手动/粘贴）
- 通过 sourcePlatform 区分场景
- 通过 transactionType 区分持仓行和交易行
- 减少重复模型，简化 confirm 逻辑

## 后续可拆表方向

- AdviceCard / RiskAlert / NewsItem 从 DailyBrief JSON 拆为独立表
- AppSettings 各配置项可拆为独立表
- 用户权限从 Member 字段发展为独立权限表
