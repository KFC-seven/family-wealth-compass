# 后端启动指南

## 环境变量

复制环境变量文件：

```bash
cp .env.example .env
```

编辑 `.env` 中的 `DATABASE_URL`。

## 国内 npm 镜像（可选）

```bash
# 复制示例配置
cp .npmrc.example .npmrc

# 取消 registry 行的注释即可使用 npmmirror
```

## Prisma engine mirror（可选）

在中国大陆下载 Prisma Engine 可能较慢，可设置：

```bash
# Linux / macOS
export PRISMA_ENGINES_MIRROR=https://cdn.npmmirror.com/binaries/prisma

# Windows PowerShell
$env:PRISMA_ENGINES_MIRROR="https://cdn.npmmirror.com/binaries/prisma"
```

## 本地 PostgreSQL 启动

### 方式一：Docker

```bash
docker compose up -d
```

### 方式二：本地安装

安装 PostgreSQL 后创建数据库：

```bash
createdb family_wealth
```

## Prisma 命令

```bash
# 生成 Prisma 客户端
npm run db:generate

# 推送 schema 到数据库（开发阶段）
npm run db:push

# 创建迁移（生产）
npm run db:migrate

# 填充种子数据（需要先配置 DATABASE_URL）
npm run db:seed

# 打开 Prisma Studio（开发用）
npm run db:studio
```

**注意**：不要在生成环境暴露 Prisma Studio。

## 启动应用

```bash
# 开发
npm run dev

# 构建
npm run build

# 生产
npm run start
```

## 常见问题

### Prisma 连接失败
确认 PostgreSQL 正在运行，且 DATABASE_URL 正确。

### Prisma 生成慢
设置 PRISMA_ENGINES_MIRROR 使用国内镜像。

### 种子数据执行失败
确认数据库已创建且 schema 已 push。

### 前端页面无变化
前端默认仍使用 mock 数据。`NEXT_PUBLIC_USE_API=true` 可切换为 API 调用（尚未完成所有页面）。
