# 家庭财富罗盘 (Family Wealth Compass)

家庭财富投资管理 Web 应用。6个阶段全部完成。

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

# 测试
npm run api:smoke      # API 冒烟测试 (需 dev server 运行中)
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
  app/                          # 前端页面 (8个路由) + API (18个路由)
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
  architecture/                 # 8份: 架构/模型/API/启动/部署/定时任务/数据源/故障排查
```

## 前端页面

| 路由 | 页面 | 类型 |
|------|------|------|
| `/` | 首页 Dashboard (下钻饼图/趋势/排行/风险) | 静态 |
| `/members` | 成员列表 | 静态 |
| `/members/[id]` | 成员详情 (持仓/已清仓/交易/理念/趋势) | 动态 |
| `/holdings` | 持仓列表 (按成员分组+下钻饼图) | 静态 |
| `/holdings/[id]` | 单仓详情 (买卖点图/收益拆解/交易周期/AI) | 动态 |
| `/import` | 导入确认 (模拟OCR→编辑→校验→保存) | 静态 |
| `/brief` | 每日简报 (市场/成员/新闻/风险/建议/推送) | 静态 |
| `/settings` | 设置 (10个分组) | 静态 |

## API (18个)

`/api/health`, `/api/portfolio/household-summary`,
`/api/members`, `/api/members/[id]`, `/api/members/[id]/summary`,
`/api/holdings`, `/api/holdings/[id]`, `/api/holdings/[id]/transactions`,
`/api/transactions` (GET+POST), `/api/import-sessions` (GET+POST),
`/api/daily-brief` (GET), `/api/settings` (GET+POST),
`/api/jobs` (GET), `/api/jobs/runs` (GET), `/api/jobs/run` (POST),
`/api/market-data/sources` (GET), `/api/market-data/sources/check` (POST)

## 数据库 (Prisma 7 + PostgreSQL)

20个模型: User, Household, Member, Account, Asset, Holding, Transaction,
PriceSnapshot, PortfolioSnapshot, InvestorProfile, ImportSession,
RecognizedImportRow, DailyBrief, AppSettings, ScheduledJob, JobRun, MarketDataSource

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
  - [ ] 导入页 → 保留mock OCR
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
- [ ] 真实OCR/AI/推送/认证

## 约定

- 中文回复
- 只在 "why" 不明显时加注释
- 不提交真实密钥
