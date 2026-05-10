# API 合同

## 统一响应格式

成功：
```json
{ "ok": true, "data": { ... } }
```

失败：
```json
{ "ok": false, "error": { "code": "ERROR_CODE", "message": "描述", "details": {} } }
```

## 已实现接口

### GET /api/health
返回：`{ status: "ok", timestamp: "ISO", uptime: number }`

### GET /api/portfolio/household-summary
返回：`{ householdId, name, totalAssets, cashBalance, memberCount }`

### GET /api/members
返回：`[{ id, name, displayName, roleLabel, isAdmin, accounts[], investorProfile? }]`

### GET /api/members/:memberId
返回：`{ id, name, accounts[], holdings[], investorProfile? }`

### GET /api/members/:memberId/summary
返回：`{ memberId, name, totalAssets, cashBalance, holdingReturn, realizedReturn, cumulativeReturn, holdingCount, accountCount }`

### GET /api/holdings
返回：`[{ id, assetName, assetType, marketValue, holdingReturn, cumulativeReturn, ... }]`

### GET /api/holdings/:holdingId
返回：完整持仓详情含交易记录

### GET /api/holdings/:holdingId/transactions
返回：`[{ id, type, tradeDate, grossAmount, fee, netAmount, ... }]`

### GET /api/transactions
返回：最近 50 条交易

### POST /api/transactions
Body: `{ householdId, memberId, accountId, type, tradeDate, grossAmount, ... }`
返回：`{ id }`

## 导入 API (Phase 10 + Phase 18)

### GET /api/import-sessions
返回：最近 20 条导入会话

### POST /api/import-sessions
创建导入会话。支持截图 OCR 和手动导入。

Body:
```json
{
  "householdId": "...",
  "sourcePlatform": "ALIPAY | BROKER | BANK | OTHER | MANUAL | BATCH_PASTE",
  "saveMode": "HOLDING_SNAPSHOT | TRANSACTION_RECORD",
  "memberId": "optional",
  "originalFileName": "optional"
}
```

- `MANUAL`: 手动录入（持仓或交易）
- `BATCH_PASTE`: 批量粘贴导入
- `HOLDING_SNAPSHOT`: 保存为当前持仓快照
- `TRANSACTION_RECORD`: 保存为交易记录

返回：`{ id }`

### GET /api/import-sessions/[sessionId]
返回：会话详情 + recognizedRows（含交易字段）

Row 响应字段：
```
id, rowIndex, memberId, accountId, assetName, assetCode, assetType, currency,
market, quantity, price, marketValue, cost, holdingReturn, holdingReturnRate,
dataDate, confidence, status, validationIssues, action, note,
// 交易字段 (Phase 18)
transactionType, tradeDate, grossAmount, fee, tax, netAmount, cashImpact, realizedReturn
```

### POST /api/import-sessions/[sessionId]/upload
Content-Type: multipart/form-data, 字段名 `file`
要求：UPLOAD_ENABLED=true, x-upload-api-secret (如配置)
返回：`{ fileName, mimeType, sizeBytes }`

### POST /api/import-sessions/[sessionId]/recognize
触发 OCR 识别，写入 RecognizedImportRow
返回：`{ provider, rowCount, confidence, durationMs }`

### POST /api/import-sessions/[sessionId]/rows
手动新增行。**支持单行和批量**。

单行：
```json
{
  "assetName": "沪深300ETF",
  "assetType": "ETF",
  "memberId": "...",
  "accountId": "...",
  "quantity": 1000,
  "price": 4.12,
  ...
}
```

批量：
```json
{
  "rows": [
    { "assetName": "...", "assetType": "...", ... },
    { "assetName": "...", "assetType": "...", ... }
  ]
}
```

支持全部 RecognizedImportRow 字段，含交易字段（transactionType, tradeDate, grossAmount, fee, tax, netAmount, cashImpact, realizedReturn）。

单行返回：`{ id }`，批量返回：`{ ids: [...], count: N }`

### PATCH /api/import-sessions/[sessionId]/rows/[rowId]
更新识别行。支持所有字段（含交易字段）。

Body: `{ assetName?, quantity?, price?, action?, status?, transactionType?, tradeDate?, grossAmount?, fee?, tax?, netAmount?, cashImpact?, realizedReturn?, note?, ... }`

### DELETE /api/import-sessions/[sessionId]/rows/[rowId]
删除识别行

### POST /api/import-sessions/[sessionId]/confirm
确认保存。根据 saveMode 执行不同逻辑。

Body: `{ saveMode: "HOLDING_SNAPSHOT" | "TRANSACTION_RECORD" }`
返回：`{ savedCount, ignoreCount, totalRows }`

#### HOLDING_SNAPSHOT 行为
遍历所有非 IGNORE 行：
1. 查找或创建 Asset（按 code+type 或 name+type）
2. 查找 Member 和 Account
3. 查找现有 CURRENT Holding，更新 price/marketValue/remainingCost/holdingReturn
4. 如无现有 Holding，创建新 Holding
5. 写入 PriceSnapshot（如有 price > 0）

#### TRANSACTION_RECORD 行为 (Phase 18 完善)
遍历所有非 IGNORE 行，按 transactionType 分别处理：

**BUY**:
- 创建 Transaction (type=BUY)
- 查找或创建 Asset + Holding (CURRENT)
- Holding quantity += buyQty, remainingCost += 买入净成本
- 平均成本法重算 averageCost = remainingCost / quantity
- cashImpact = -(netAmount)（资金流出）
- realizedReturn = 0

**SELL**:
- 创建 Transaction (type=SELL)
- 查找 Holding（必须存在），验证 quantity <= holding.quantity
- 平均成本法：soldCost = avgCost × sellQty
- realizedReturn = netAmount - soldCost
- Holding quantity -= sellQty, remainingCost -= soldCost
- 如 quantity 变为 0：status = CLEARED, marketValue = 0, holdingReturn = 0
- cashImpact = netAmount（资金流入）
- 写入 PriceSnapshot

**DIVIDEND**:
- 创建 Transaction (type=DIVIDEND)
- realizedReturn = netAmount
- cashImpact = netAmount（资金流入）
- 更新 Holding realizedReturn 和 cumulativeReturn

**INTEREST**:
- 同 DIVIDEND

**DEPOSIT**:
- 创建 Transaction (type=DEPOSIT)
- realizedReturn = 0（不计入收益）
- cashImpact = netAmount（资金流入）

**WITHDRAW**:
- 创建 Transaction (type=WITHDRAW)
- realizedReturn = 0（不计入收益）
- cashImpact = -netAmount（资金流出）

**FEE**:
- 创建 Transaction (type=FEE)
- realizedReturn = -fee（减少已实现收益）
- cashImpact = -fee（资金流出）
- 更新 Holding realizedReturn 和 cumulativeReturn

**ADJUSTMENT**:
- 创建 Transaction (type=ADJUSTMENT)
- 必须填写 note，否则跳过
- realizedReturn = 0（不自动推断）
- cashImpact = 用户指定值

### GET /api/daily-brief
返回：最新简报

### GET /api/settings
返回：家庭设置

### POST /api/settings
Body: `{ appearance?, returnMethod?, pushSettings?, ... }`
返回：`{ id }`

## Phase 8 新增接口

### GET /api/jobs
返回：任务配置和最近运行状态列表
```json
[{ "id": "...", "name": "update-market-prices", "displayName": "更新行情/净值",
   "cronExpression": "30 21 * * 1-5", "isEnabled": true,
   "lastRunAt": "2026-04-29T...", "lastStatus": "SUCCESS" }]
```

### GET /api/jobs/runs?limit=20
返回：最近 JobRun 列表
```json
[{ "id": "...", "jobName": "run-daily-valuation", "status": "SUCCESS",
   "startedAt": "...", "finishedAt": "...", "durationMs": 1234,
   "triggeredBy": "MANUAL", "successCount": 15, "failureCount": 0, "skippedCount": 0 }]
```

### POST /api/jobs/run
Body: `{ "jobName": "run-daily-valuation", "date": "2026-04-29" }`
Headers: `x-job-api-secret` (如果环境变量 JOB_API_SECRET 已设置)
返回：任务执行结果 `{ status, successCount, failureCount, skippedCount, ... }`

### GET /api/market-data/sources
返回：数据源状态列表
```json
[{ "id": "...", "name": "mock", "displayName": "Mock 数据源",
   "type": "MOCK", "isEnabled": true, "priority": 10, "lastStatus": "HEALTHY" }]
```

### POST /api/market-data/sources/check
返回：所有数据源健康检查结果
```json
{ "mock": { "status": "HEALTHY", "checkedAt": "...", "message": "Mock 始终可用" } }
```

## 错误码

| code | 说明 | HTTP |
|------|------|------|
| VALIDATION_ERROR | 输入校验失败 | 400 |
| NOT_FOUND | 资源不存在 | 404 |
| UNAUTHORIZED | API Secret 校验失败 | 401 |
| DATABASE_ERROR | 数据库错误 | 500 |
| INTERNAL_ERROR | 服务器内部错误 | 500 |
| NOT_IMPLEMENTED | 未实现 | 501 |
