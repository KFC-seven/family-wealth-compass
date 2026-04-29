# 后端启动指南

## 环境变量

复制环境变量文件：

```bash
cp .env.example .env
```

本地开发默认值无需修改即可使用 Docker PostgreSQL。

## 国内 npm 镜像（可选）

```bash
cp .npmrc.example .npmrc
# 取消 registry 行的注释即可使用 npmmirror
```

## Prisma engine mirror（可选）

在中国大陆下载 Prisma Engine 可能较慢，可在 `.env` 中取消注释：

```env
PRISMA_ENGINES_MIRROR="https://cdn.npmmirror.com/binaries/prisma"
```

## 一键本地初始化（推荐）

```bash
npm run setup:local
```

等效于：

```bash
npm run db:up        # 启动 PostgreSQL (Docker)
npm run db:wait      # 等待数据库就绪
npm run db:generate  # 生成 Prisma Client
npm run db:push      # 推送 schema
npm run db:seed      # 填充种子数据
```

## 分步操作

### 启动 PostgreSQL

```bash
# 方式一：Docker（推荐）
docker compose up -d
npm run db:up         # 等效 npm script
docker compose down   # 停止
npm run db:logs       # 查看日志

# 方式二：本地安装
createdb family_wealth
```

### 初始化数据库

```bash
npm run db:generate   # 生成 Prisma 客户端
npm run db:push       # 推送 schema 到数据库（开发阶段）
npm run db:migrate    # 创建迁移（生产环境）
npm run db:seed       # 填充种子数据
npm run db:studio     # Prisma Studio（开发用，不要暴露到公网）
```

### 数据库管理

```bash
npm run db:reset      # 强制重置（删除所有数据，重新建表+seed）
npm run db:doctor     # 完整诊断报告
npm run db:wait       # 等待 PostgreSQL 就绪
npm run db:logs       # 查看 PostgreSQL 容器日志
```

## 启动应用

```bash
npm run dev           # 开发服务器 (http://localhost:3000)
npm run build         # 生产构建
npm run start         # 启动生产服务器
```

## 定时任务

```bash
npm run job:daily-valuation          # 每日估值（行情→持仓→快照）
npm run job:update-prices            # 更新行情/净值
npm run job:refresh-holdings         # 刷新持仓快照
npm run job:portfolio-snapshot       # 生成组合快照
npm run scheduler:start              # 常驻调度器（开发用）
```

生产环境推荐 cron：`30 21 * * 1-5 cd /path/to/app && npm run db:wait && npm run job:daily-valuation`

## API 测试

```bash
# 需要 dev server 在运行
npm run api:smoke
```

## 本地完整验证流程

```bash
# 1. 一键初始化
npm run setup:local

# 2. 运行诊断
npm run db:doctor

# 3. 运行每日估值
npm run job:daily-valuation

# 4. 启动应用
npm run dev

# 5. 冒烟测试（另一个终端）
npm run api:smoke

# 6. 导入链路测试（不需要 dev server）
npm run import:smoke

# 6. 构建验证
npm run build
```

## 环境变量说明

| 变量 | 默认值 | 说明 |
|------|--------|------|
| DATABASE_URL | postgresql://postgres:postgres@localhost:5432/family_wealth | 数据库连接 |
| NEXT_PUBLIC_USE_API | false | 前端使用 API / mock |
| NEXT_PUBLIC_API_BASE | "" | API 基础路径 |
| MARKET_DATA_MODE | mock | 行情数据模式 |
| SCHEDULER_ENABLED | false | 启用常驻调度器 |
| JOB_API_SECRET | "" | 生产环境必设 |

完整列表见 `.env.example`。

## 常见问题

### PostgreSQL 不可用
1. 运行 `npm run db:doctor` 诊断
2. 运行 `npm run db:up` 启动
3. 查看容器日志 `npm run db:logs`
4. 详见 `docs/architecture/postgresql-troubleshooting.md`

### Prisma 连接失败
确认 PostgreSQL 正在运行，且 DATABASE_URL 正确。

### Prisma 生成慢
设置 PRISMA_ENGINES_MIRROR 使用国内镜像。

### 种子数据执行失败
确认数据库已创建且 schema 已 push。

### 前端页面无变化
前端默认仍使用 mock 数据。`NEXT_PUBLIC_USE_API=true` 可切换为 API 调用。

### 端口冲突
修改 `docker-compose.yml` 端口映射，对应修改 `.env` 中的 DATABASE_URL。
