# Mock → API 迁移文档

## 数据源策略

| 模式 | 行为 |
|------|------|
| `NEXT_PUBLIC_USE_API=false`（默认） | 前端直接使用 mock 数据，无 API 调用 |
| `NEXT_PUBLIC_USE_API=true` | 前端通过数据访问层调用 API，失败时 fallback 到 mock |

## 使用方式

在 `.env` 文件中设置：

```env
NEXT_PUBLIC_USE_API=false   # 使用 mock 数据
NEXT_PUBLIC_USE_API=true    # 使用 API 数据（需要数据库和 dev server 运行）
```

也可以在启动时临时覆盖：

```bash
NEXT_PUBLIC_USE_API=true npm run dev
```

## 已接入 API 的页面

| 页面 | 路由 | 接入状态 | 数据来源 |
|------|------|---------|---------|
| 首页 Dashboard | `/` | ✅ 已接入 | API（趋势/风险仍用 mock） |
| 成员列表 | `/members` | ✅ 已接入 | API |
| 成员详情 | `/members/[id]` | ✅ 已接入 | API + mock（趋势/交易/理念） |
| 持仓列表 | `/holdings` | ✅ 已接入 | API |
| 单仓详情 | `/holdings/[id]` | ✅ 已接入 | API + mock（价格走势/新闻/建议） |
| 每日简报 | `/brief` | ✅ 已接入 | API（mock fallback） |
| 设置 | `/settings` | 🟡 部分接入 | 主要为 mock（API GET 可用） |
| 导入页 | `/import` | ⏸️ 暂不接入 | 保留 mock OCR 流程 |

## 仍使用 mock 的模块

| 模块 | 说明 |
|------|------|
| 收益趋势（日/月） | 等待 PortfolioSnapshot API 扩展 |
| 风险提醒 | 无独立 API，保留 mock |
| 价格走势图 | PriceSnapshot 已有但未细化查询 |
| 相关新闻 / AI 建议 | 无真实数据源 |
| 投资理念 | 有 API 但前端仍需适配 |
| 交易记录 | 无种子数据，API 正常但返回空 |

## API 失败 fallback 策略

1. 每页/组件独立 try/catch
2. API 异常时 console.warn 提示
3. 自动降级到同类型 mock 数据
4. 页面不崩溃，用户无感知

## 数据访问层结构

```
src/lib/
  api/api-client.ts        # 基础 API 客户端（fetch 封装）
  data-source.ts           # 数据源切换层（mock ↔ API）
  use-data-source.ts       # Client-side hooks（用于 "use client" 页面）
src/server/finance/
  mappers.ts               # API → ViewModel 映射器
```

## 本地验证步骤

```bash
# 1. 启动数据库
cd pgsql/bin && ./pg_ctl -D ../../pgdata start

# 2. 填充数据
cd ../.. && npm run db:push && npm run db:seed

# 3. 启动 dev 服务器
npm run dev

# 4. 验证 API（新终端）
npm run api:smoke

# 5. 验证 mock 模式
# 打开 http://localhost:3000 ，所有页面正常

# 6. 验证 API 模式
NEXT_PUBLIC_USE_API=true npm run dev
# 打开 http://localhost:3000 ，核心页面数据来自 API
```

## 已知限制

1. 数据库种子数据与 mock 数据不完全一致（金额不同，属正常）
2. 趋势图和风险提醒在 API 模式下仍使用 mock
3. 交易记录无种子数据，交易表为空
4. 设置页主要使用 mock，API GET 可用但页面尚未完全适配
5. 简报页的 JSON 字段映射已实现但复杂结构需进一步验证

## 下一阶段建议

1. 完善 PortfolioSnapshot 查询用于趋势图
2. 添加交易记录种子数据
3. 补充 PriceSnapshot 查询用于价格走势
4. 设置页 POST 保存持久化
5. 导入页对接真实 POST /api/import-sessions
