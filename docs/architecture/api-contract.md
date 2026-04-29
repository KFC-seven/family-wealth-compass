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

### GET /api/import-sessions
返回：最近 20 条导入会话

### POST /api/import-sessions
Body: `{ householdId, sourcePlatform, saveMode, ... }`
返回：`{ id }`

## Phase 10 新增接口

### GET /api/import-sessions/[sessionId]
返回：会话详情 + recognizedRows

### POST /api/import-sessions/[sessionId]/upload
Content-Type: multipart/form-data, 字段名 `file`
要求：UPLOAD_ENABLED=true, x-upload-api-secret (如配置)
返回：`{ fileName, mimeType, sizeBytes }`

### POST /api/import-sessions/[sessionId]/recognize
触发 OCR 识别，写入 RecognizedImportRow
返回：`{ provider, rowCount, confidence, durationMs }`

### POST /api/import-sessions/[sessionId]/rows
手动新增一行
Body: `{ assetName, assetType, ... }`
返回：`{ id }`

### PATCH /api/import-sessions/[sessionId]/rows/[rowId]
更新识别行
Body: `{ assetName?, quantity?, price?, action?, status?, ... }`

### DELETE /api/import-sessions/[sessionId]/rows/[rowId]
删除识别行

### POST /api/import-sessions/[sessionId]/confirm
确认保存
Body: `{ saveMode: "HOLDING_SNAPSHOT" | "TRANSACTION_RECORD", defaultTransactionType? }`
返回：`{ savedCount, ignoreCount, totalRows }`

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
| DATABASE_ERROR | 数据库错误 | 500 |
| INTERNAL_ERROR | 服务器内部错误 | 500 |
| NOT_IMPLEMENTED | 未实现 | 501 |

## 后续接口计划

- GET /api/portfolio/snapshots (趋势图数据)
- POST /api/import-sessions/:sessionId/confirm
- GET /api/daily-brief/:briefId
- 逐页 API 接入前端
