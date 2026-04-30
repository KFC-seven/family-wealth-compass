# 家庭财富罗盘 (Family Wealth Compass)

家庭财富投资管理 Web 应用，单家庭自用。17 个阶段完成，已部署到阿里云 ECS。

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
npm run providers:doctor     # Provider 配置诊断
npm run real-providers:smoke # 真实 Provider 测试 (无 key 时 SKIP)
npm run real-brief:dry-run    # 真实简报演练 (--push 含推送)
npm run deploy:check       # 部署前安全检查
npm run prod:smoke          # 生产环境冒烟测试
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
  lib/                          # format, returns, import-validation, api-client
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
| `/import` | 导入确认 (上传/OCR/编辑/校验/保存) | 静态 |
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

## 定时任务和行情数据源 (Phase 8)

- [x] 定时任务框架 (registry/runner/logger)
- [x] 4个任务: update-market-prices, refresh-holding-snapshots, generate-portfolio-snapshots, run-daily-valuation
- [x] 数据源抽象层 (Mock, Manual, Eastmoney Fund, Tushare 骨架)
- [x] CLI 单次执行 + 可选常驻调度器
- [x] jobs API + market-data API
- [x] 设置页接入数据源和任务状态
- [x] Mock/Manual fallback 完整可用

## 部署配置

- docker-compose.yml (PostgreSQL)
- standalone 输出模式 (next.config.ts)
- .env.example / .npmrc.example (国内镜像配置)
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
  - [x] TRANSACTION_RECORD 基础结构 (待完善 cashImpact/realizedReturn)
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
  - [ ] 真实 DeepSeek API 调用 (需 DEEPSEEK_API_KEY)
  - [ ] 真实 WeCom/Server 酱推送 (需配置 webhook)
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

## 明确不做 / Out of Scope

- 多家庭 SaaS
- 多租户隔离 / 公开注册 / 付费订阅
- 自动交易 / 券商银行自动登录
- 企业级 RBAC 权限后台

Household 是单家庭容器，不表示 SaaS 多租户。认证仅服务该家庭内部成员。

## 约定

- 中文回复
- 只在 "why" 不明显时加注释
- 不提交真实密钥
