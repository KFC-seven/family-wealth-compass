# 家庭财富罗盘 (Family Wealth Compass)

家庭财富投资管理 Web 应用，单家庭自用。18 个阶段完成，已部署到阿里云 ECS。

## 运行命令

```bash
# 开发
npm run dev            # 开发服务器 (http://localhost:3000)
npm run build          # 生产构建
npm run start          # 启动生产服务器

# 数据库
npm run db:up          # 启动 PostgreSQL (Docker)
npm run db:down        # 停止 PostgreSQL
npm run db:logs        # 查看数据库日志
npm run db:generate    # 生成 Prisma 客户端
npm run db:push        # 推送 schema 到数据库
npm run db:migrate     # 创建迁移
npm run db:seed        # 填充种子数据
npm run db:studio      # Prisma Studio
npm run db:reset       # 强制重置数据库 + seed
npm run db:doctor      # 数据库诊断报告
npm run db:wait        # 等待 PostgreSQL 就绪
npm run setup:local    # 一键本地初始化 (db:up → wait → generate → push → seed)

# 定时任务
npm run job:daily-valuation   # 每日估值（行情→持仓→快照）
npm run job:update-prices     # 更新行情/净值
npm run job:refresh-holdings  # 刷新持仓快照
npm run job:portfolio-snapshot # 生成组合快照
npm run scheduler:start       # 常驻调度器（开发用）
npm run job:generate-brief    # 生成每日简报
npm run job:push-brief        # 推送每日简报
npm run job:morning-brief     # 每日晨报（生成+推送）

# 测试
npm run api:smoke      # API 冒烟测试 (需 dev server 运行中)
npm run import:smoke    # 导入链路冒烟测试 (service-level)
npm run brief:smoke     # AI简报+推送冒烟测试 (service-level)
npm run manual-import:smoke  # 手动导入冒烟测试 (service-level)
npm run providers:doctor     # Provider 配置诊断
npm run real-providers:smoke # 真实 Provider 测试 (无 key 时 SKIP)
npm run real-brief:dry-run    # 真实简报演练 (--push 含推送)
npm run deploy:check       # 部署前安全检查
npm run prod:smoke          # 生产环境冒烟测试
npm run enable-real-data    # 启用真实行情数据源 (天天基金+新浪财经)
npm run deploy              # 一键部署到生产服务器
npm run test                # 运行单元测试 (vitest)
npm run test:watch          # 单元测试 (watch 模式)
```

## 技术栈

- **前端框架**: Next.js 16 + TypeScript
- **样式**: Tailwind CSS v4 + `@tailwindcss/postcss`
- **组件库**: shadcn/ui + lucide-react
- **图表**: recharts
- **ORM**: Prisma 7 + `@prisma/adapter-pg`
- **数据库**: PostgreSQL
- **校验**: Zod 4
- **包管理**: npm

## 项目结构

```
src/
  app/                          # 前端页面 (10个路由) + API (35个路由)
  components/                   # 8个分类目录, 60+ 组件
  data/                         # 12个 mock 数据文件
  lib/                          # format, returns, import-validation, api-client, import-helpers
  server/                       # db/prisma, api/response, api/validators,
                                # finance/calculations, finance/mappers
                                # jobs/ (定时任务), market-data/ (数据源)
  types/                        # finance, import, brief, settings
  generated/prisma/             # Prisma 客户端 (自动生成)
prisma/
  schema.prisma                 # 20个模型 + 22个枚举
  seed.ts                       # 种子数据
scripts/
  run-job.ts                    # CLI 单次任务执行
  scheduler.ts                  # 可选常驻调度器
  api-smoke.ts                  # API 冒烟测试
docs/
  design/                       # Apple-inspired 设计文档
  product/                      # PRD + 前端验收清单
  architecture/                 # 10份: 架构/模型/API/启动/部署/定时任务/数据源/故障排查/上传/OCR
```

## 前端页面

| 路由 | 页面 | 类型 |
|------|------|------|
| `/` | 首页 Dashboard (下钻饼图/趋势/排行/风险) | 静态 |
| `/members` | 成员列表 | 静态 |
| `/members/[id]` | 成员详情 (持仓/已清仓/交易/理念/趋势) | 动态 |
| `/holdings` | 持仓列表 (按成员分组+下钻饼图) | 静态 |
| `/holdings/[id]` | 单仓详情 (买卖点图/收益拆解/交易周期/AI) | 动态 |
| `/import` | 导入中心 (截图OCR/手动持仓/手动交易/批量粘贴) | 静态 |
| `/brief` | 每日简报 (市场/成员/新闻/风险/建议/推送) | 静态 |
| `/settings` | 设置 (10个分组) | 静态 |
| `/login` | 登录 | 动态 |
| `/account` | 账户与安全 | 动态 |

## API (29个)

`/api/health`, `/api/portfolio/household-summary`,
`/api/members`, `/api/members/[id]`, `/api/members/[id]/summary`,
`/api/holdings`, `/api/holdings/[id]`, `/api/holdings/[id]/transactions`,
`/api/transactions` (GET+POST), `/api/import-sessions` (GET+POST),
`/api/import-sessions/[id]` (GET),
`/api/import-sessions/[id]/upload` (POST),
`/api/import-sessions/[id]/recognize` (POST),
`/api/import-sessions/[id]/rows` (POST),
`/api/import-sessions/[id]/rows/[rowId]` (PATCH+DELETE),
`/api/import-sessions/[id]/confirm` (POST),
`/api/import-sessions/[id]/parse-paste` (POST, 可选),
`/api/daily-brief` (GET),
`/api/daily-brief/generate` (POST),
`/api/daily-brief/push` (POST),
`/api/ai/status` (GET),
`/api/push/status` (GET), `/api/push/test` (POST),
`/api/auth/login` (POST), `/api/auth/logout` (POST),
`/api/auth/me` (GET), `/api/auth/change-password` (POST),
`/api/auth/sessions` (GET), `/api/auth/sessions/[id]` (DELETE),
`/api/settings` (GET+POST),
`/api/jobs` (GET), `/api/jobs/runs` (GET), `/api/jobs/run` (POST),
`/api/market-data/sources` (GET), `/api/market-data/sources/check` (POST)

## 数据库 (Prisma 7 + PostgreSQL)

22个模型: User, Household, Member, Account, Asset, Holding, Transaction,
PriceSnapshot, PortfolioSnapshot, InvestorProfile, ImportSession,
RecognizedImportRow, DailyBrief, AppSettings, ScheduledJob, JobRun, MarketDataSource,
AiGenerationRun, PushNotification, PasswordCredential, UserSession

## 定时任务和行情数据源 (Phase 8 + 真实数据源)

- [x] 定时任务框架 (registry/runner/logger)
- [x] 7个任务: update-market-prices, refresh-holding-snapshots, generate-portfolio-snapshots, run-daily-valuation, generate-daily-brief, push-daily-brief, run-morning-brief
- [x] 数据源抽象层 (Mock, Manual, Eastmoney Fund, Sina Finance, Tushare 骨架)
  - [x] SinaFinanceProvider — 新浪财经免费接口，覆盖 A_SHARE / ETF / US_STOCK
  - [x] EastmoneyFundProvider — 天天基金免费接口，覆盖 MUTUAL_FUND 净值
  - [x] 自动按资产类型路由：基金→天天基金，A股/美股→新浪财经
- [x] 生产行情模式: `MARKET_DATA_MODE=mixed` (Mock/Manual 禁用，真实源优先)
- [x] CLI 单次执行 + 可选常驻调度器
- [x] jobs API + market-data API
- [x] 设置页接入数据源和任务状态
- [x] Mock/Manual fallback 保留 (DB disabled, provider 兜底)
- [x] `enable-real-data` 脚本一键启用真实数据源
- [x] 生产验证: 12/12 资产获取真实行情 (A股/美股/ETF: MARKET_API, 基金: MARKET_API)

## 部署配置

- docker-compose.yml (PostgreSQL)
- standalone 输出模式 (next.config.ts)
- .env.example / .npmrc.example (国内镜像配置)
- deploy.sh 一键部署脚本
- docs/architecture/ 部署文档 (阿里云 ECS)

## 设计规范

- Apple-inspired, 高级克制, 金融可信
- 正收益=红色, 负收益=绿色
- 响应式: 移动端优先
- 收益三种口径严格区分

## 实现状态

- [x] 6个阶段全部完成
- [x] 前端8个页面 + 下钻图表 + 模拟OCR + 投资简报 + 设置
- [x] 后端Prisma schema + 种子数据 + 13个API路由 + 5份文档
- [x] 前端mock→API切换 (可通过NEXT_PUBLIC_USE_API开启，7个核心页面已接入)
  - [x] 首页 Dashboard → API (趋势/风险保留mock fallback)
  - [x] 成员列表 → API
  - [x] 成员详情 → API (趋势/交易保留mock fallback)
  - [x] 持仓列表 → API
  - [x] 单仓详情 → API (价格/新闻保留mock fallback)
  - [x] 每日简报 → API (有mock fallback)
  - [x] 设置页 → 数据源/定时任务/收益口径已接API
  - [x] 导入页 → API 驱动上传/OCR，LocalStorage + MockOcrProvider 可用，mock fallback 保留
- [x] 定时任务框架 + 行情/净值数据源 (Phase 8)
  - [x] CLI 单次执行 + 可选常驻调度器
  - [x] Mock/Manual/Eastmoney/Tushare provider
  - [x] jobs API + market-data API
  - [x] job:daily-valuation 可完整执行
- [x] PostgreSQL 可用性修复 + 数据链路稳定化 (Phase 9)
  - [x] docker-compose.yml healthcheck
  - [x] .env.example 完善
  - [x] wait-for-db.ts / db-doctor.ts 诊断脚本
  - [x] setup:local 一键初始化
  - [x] /api/health 数据库状态报告
  - [x] api:smoke 覆盖 10 个端点
  - [x] seed 日期适配当前时间
  - [x] PostgreSQL 故障排查文档
  - [x] 全链路验证: api:smoke 10/10 通过, job:daily-valuation SUCCESS
- [x] 真实截图上传 + OCR 接入 (Phase 10)
  - [x] 本地真实文件上传 (LocalStorageProvider) 
  - [x] Mock OCR 完整可用 (MockOcrProvider)
  - [x] Import API 完整链路 (upload → recognize → edit → confirm)
  - [x] 导入页 API 驱动 (保留 mock fallback)
  - [x] HOLDING_SNAPSHOT 保存完整可用
  - [x] TRANSACTION_RECORD 完整保存 (Phase 18 完善, 支持8种交易类型)
  - [x] 文件校验 (大小/MIME/扩展名/hash)
  - [ ] 阿里云 OSS 真实上传 (骨架已预留)
  - [ ] 阿里云 OCR 真实调用 (骨架已预留)
- [x] AI 简报生成 + 微信推送 (Phase 11)
  - [x] AI provider 抽象层 (Mock AI + DeepSeek + 阿里云百炼骨架)
  - [x] DailyBrief 生成服务 (context-builder + generator + persistence)
  - [x] AI 输出 Zod 校验 + 安全检查 (禁止词/建议完整性)
  - [x] 微信推送 provider 抽象层 (Mock + WeCom Bot + Server 酱)
  - [x] 3 个新任务: generate-daily-brief, push-daily-brief, run-morning-brief
  - [x] 5 个新 API: brief generate/push, ai status, push status/test
  - [x] job:morning-brief 可完整执行 (生成→推送)
  - [x] brief:smoke 6/6 通过
  - [x] 真实 DeepSeek API 调用 (用户已配置 key, 生产验证通过)
  - [x] 真实 Server 酱推送 (用户已配置 key, 生产验证通过)
  - [ ] 真实 WeCom Bot 推送验证 (用户未配置)
  - [ ] 阿里云百炼真实调用 (骨架已预留)
- [x] 认证与家庭权限 (Phase 12)
  - [x] 密码哈希 (PBKDF2-SHA512, 10万次迭代)
  - [x] PasswordCredential + UserSession 模型
  - [x] 登录/登出/me/改密/sessions API
  - [x] /login 和 /account 页面
  - [x] Middleware 页面保护 (AUTH_ENABLED=true 时)
  - [x] Guards + Permissions (管理员/成员权限分离)
  - [x] ALL_VISIBLE 权限模式
  - [x] CUSTOM 权限框架
  - [x] auth:smoke 6/6 通过
  - [x] seed 管理员 (SEED_ADMIN_EMAIL/PASSWORD)
- [x] 生产部署硬化 (Phase 13)
  - [x] .env.production.example
  - [x] PM2 ecosystem.config.cjs
  - [x] systemd service 示例
  - [x] Nginx 反向代理配置示例
  - [x] PostgreSQL 生产部署与硬化文档
  - [x] db backup/restore 脚本
  - [x] deploy:check 部署检查
  - [x] security-hardening 安全清单
  - [x] production-deployment 完整部署指南
- [x] Provider 配置验证 + 产品边界固化 (Phase 14-15)
  - [x] DeepSeek/WeCom/Server 酱 provider 配置检测完善
  - [x] providers:doctor (配置矛盾检测, mask, 修复建议)
  - [x] real-providers:smoke (无 key SKIP, 有 key 真实调用+token统计)
  - [x] real-brief:dry-run (真实简报演练, --push 推送)
  - [x] secret mask 工具 (maskSecret/maskWebhook/maskUrl)
- [x] 阿里云 ECS 生产部署硬化 (Phase 16)
  - [x] .env.production.example 完整
  - [x] PM2 配置 + systemd 示例
  - [x] Nginx 反代配置 + HTTPS 说明
  - [x] PostgreSQL 生产硬化 + db backup/restore
  - [x] crontab 定时任务示例
  - [x] deploy:check 生产检查增强
  - [x] prod:smoke 生产验收
  - [x] 回滚方案文档化
  - [x] scripts 统一 .env.production 加载
  - [x] AI/Push status API 不暴露 secret
  - [x] 明确"单家庭自用"产品边界
- [x] DeepSeek + Server 酱本地验证 (Phase 15, 用户已配置 key)
- [ ] 真实 WeCom Bot 推送验证 (用户未配置)
- [x] ECS 部署验收 (Phase 17)
  - [x] 阿里云 ECS 实际部署: 106.15.37.44
  - [x] PostgreSQL 18 + Node 22 + Nginx + PM2
  - [x] API 模式 + 认证已开启
  - [x] DeepSeek + Server 酱生产验证通过
  - [x] job:daily-valuation 生产通过 (40/0/4)
  - [x] crontab 定时任务已配置
  - [x] 数据库备份 (87K SQL)
  - [ ] HTTPS/域名 (使用 IP 直连)
- [x] 手动导入 + 交易记录保存完善 (Phase 18)
  - [x] `/import` 新增手动录入持仓 tab
  - [x] `/import` 新增手动录入交易 tab
  - [x] `/import` 新增批量粘贴 tab
  - [x] ImportSession 支持 MANUAL / BATCH_PASTE sourcePlatform
  - [x] RecognizedImportRow 支持交易字段 (transactionType/tradeDate/grossAmount/fee/tax/netAmount/cashImpact/realizedReturn)
  - [x] TRANSACTION_RECORD 完善: BUY/SELL/DIVIDEND/INTEREST/DEPOSIT/WITHDRAW/FEE/ADJUSTMENT
  - [x] 交易保存正确计算 cashImpact / realizedReturn / Holding 联动
  - [x] BUY: quantity/remainingCost 增加, averageCost 重算
  - [x] SELL: quantity/remainingCost 减少, realizedReturn 计算, CLEARED 状态
  - [x] DIVIDEND/INTEREST: realizedReturn 增加, cashImpact 为正
  - [x] DEPOSIT/WITHDRAW: 不计入收益
  - [x] FEE: 费用减少 realizedReturn
  - [x] ADJUSTMENT: 要求备注, 不自动推断收益
  - [x] 批量 rows API (POST 支持数组)
  - [x] 后台校验 row 级错误
  - [x] 截图 OCR 导入流程保持完整
  - [x] manual-import:smoke 14/14 通过
  - [ ] 阿里云 OSS 真实上传 (骨架已预留)
  - [ ] 阿里云 OCR 真实调用 (骨架已预留)
- [x] 真实行情数据源接入 (新浪财经 + 天天基金)
  - [x] SinaFinanceProvider — 新浪财经免费接口 (A_SHARE/ETF/US_STOCK)
  - [x] EastmoneyFundProvider 启用 — 天天基金净值 (MUTUAL_FUND)
  - [x] 行情模式切换: `MARKET_DATA_MODE=mixed` (Mock/Manual 禁用，真实源优先)
  - [x] 自动资产类型路由: 基金→天天基金, A股/美股/ETF→新浪财经
  - [x] 生产验证: 12/12 资产获取真实行情，10/12 为 MARKET_API 源
  - [x] `enable-real-data` 脚本 + DB 数据源管理
  - [x] 5 个数据源: Mock(f) / Manual(f) / Eastmoney(t) / Sina(t) / Tushare(f)
  - [x] crontab 环境变量修复 (NODE_ENV + 路径)
  - [x] run-job.ts 动态 import 修复 (ESM hoisting 环境变量加载顺序)
  - [ ] 真实新闻数据源
  - [ ] 黄金积存金行情 (暂无免费公开 API)

## 明确不做 / Out of Scope

- 多家庭 SaaS
- 多租户隔离 / 公开注册 / 付费订阅
- 自动交易 / 券商银行自动登录
- 企业级 RBAC 权限后台

Household 是单家庭容器，不表示 SaaS 多租户。认证仅服务该家庭内部成员。

## Agent 工作流（强制执行）

本项目配置了 architect / coder / finder 三个专用 agent。**所有开发工作必须遵循此流程。**

### 角色

| Agent | 模型 | 用途 |
|-------|------|------|
| `architect` | deepseek-v4-pro | 深度分析 + 任务拆解 + 验收整合。**只分析不写代码** |
| `coder` | deepseek-v4-flash | 接收明确任务包 → 高效实现 → 提交 summary |
| `finder` | deepseek-v4-flash | 代码搜索 / 定位 / 引用追踪，**只读不改** |

### 强制流程

```
用户需求
  ↓
architect 分析 → 输出 .claude/handoffs/tasks/<id>.md（定位+分析+目标）
  ↓
coder 读取任务包 → 实现 → 输出 .claude/handoffs/summaries/<id>.md
  ↓
architect 验收 summary → 检查代码 → 告知用户/创建修正任务
```

### 什么时候触发工作流 → 必须走 architect→coder 流程

| 场景 | 示例 |
|------|------|
| 新功能/新页面 | "添加一个资产报告页面" |
| 跨文件重构 | "把交易计算逻辑抽到 service 层" |
| 非 trivial bug 修复 | "导入确认后持仓没更新"（需要分析根因） |
| 架构/方案决策 | "行情数据源要不要加缓存层" |

### 什么时候不触发 → 直接回答或执行

| 场景 | 示例 | 处理方式 |
|------|------|---------|
| 纯提问/了解代码 | "这个函数做了什么？" "数据库有几个模型？" | 直接回答 |
| 解释/教学 | "解释这个文件的逻辑" "Prisma 怎么用？" | 直接回答 |
| 搜索定位 | "哪里处理了买入逻辑？" | 直接搜或用 **finder** agent |
| 单文件小改动 | "在这个组件加一个 loading 状态" | 直接改，无需 handoff |
| Trivial 修复 | typo、配置值、注释修正 | 直接改 |

### 硬规则（触发工作流时）

1. **architect 先分析** — 输出 task handoff 到 `.claude/handoffs/tasks/<id>.md`
2. **architect 不写代码** — 只产出 handoff，不直接改文件
3. **coder 不分析需求** — 读 handoff 直接实现，不节外生枝
4. **必须有 summary** — coder 完成后写入 `.claude/handoffs/summaries/<id>.md`
5. **architect 验收** — 读 summary + 检查代码，通过才告知用户完成

### Handoff 格式

Task（architect 输出，`.claude/handoffs/tasks/<id>.md`）:
```
# Task: <标题>
## 定位 — 涉及文件/模块/参考代码
## 分析 — 现状/问题/约束
## 目标 — 具体成果 + 验收标准
```

Summary（coder 输出，`.claude/handoffs/summaries/<id>.md`）:
```
# Summary: <标题>
## 改动清单 — 逐一说明
## 变更文件 — 含行号
## 自检 — 符合目标/未破坏现有/风格一致
```

## 约定

- 中文回复
- 只在 "why" 不明显时加注释
- 不提交真实密钥
