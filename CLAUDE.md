# 家庭财富罗盘 (Family Wealth Compass)

家庭财富投资管理 Web 应用。6个阶段全部完成。

## 运行命令

```bash
npm run dev            # 开发服务器 (http://localhost:3000)
npm run build          # 生产构建
npm run start          # 启动生产服务器
npm run db:generate    # 生成 Prisma 客户端
npm run db:push        # 推送 schema 到数据库
npm run db:migrate     # 创建迁移
npm run db:seed        # 填充种子数据
npm run db:studio      # Prisma Studio
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
  app/                          # 前端页面 (8个路由) + API (13个路由)
  components/                   # 8个分类目录, 60+ 组件
  data/                         # 12个 mock 数据文件
  lib/                          # format, returns, import-validation, api-client
  server/                       # db/prisma, api/response, api/validators,
                                # finance/calculations, finance/mappers
  types/                        # finance, import, brief, settings
  generated/prisma/             # Prisma 客户端 (自动生成)
prisma/
  schema.prisma                 # 17个模型 + 18个枚举
  seed.ts                       # 种子数据
docs/
  design/                       # Apple-inspired 设计文档
  product/                      # PRD + 前端验收清单
  architecture/                 # 5份: 架构/模型/API/启动/部署
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

## API (13个)

`/api/health`, `/api/portfolio/household-summary`,
`/api/members`, `/api/members/[id]`, `/api/members/[id]/summary`,
`/api/holdings`, `/api/holdings/[id]`, `/api/holdings/[id]/transactions`,
`/api/transactions` (GET+POST), `/api/import-sessions` (GET+POST),
`/api/daily-brief` (GET), `/api/settings` (GET+POST)

## 数据库 (Prisma 7 + PostgreSQL)

17个模型: User, Household, Member, Account, Asset, Holding, Transaction,
PriceSnapshot, PortfolioSnapshot, InvestorProfile, ImportSession,
RecognizedImportRow, DailyBrief, AppSettings

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
- [ ] 前端mock→API切换 (可通过NEXT_PUBLIC_USE_API开启)
- [ ] 真实OCR/AI/行情/推送/认证

## 约定

- 中文回复
- 只在 "why" 不明显时加注释
- 不提交真实密钥
