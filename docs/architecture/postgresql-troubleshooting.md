# PostgreSQL 故障排查指南

## 一、推荐方式

### 本地开发：Docker PostgreSQL

```bash
docker compose up -d          # 启动 PostgreSQL
npm run db:up                 # 等效命令
npm run db:wait               # 等待数据库就绪
npm run db:logs               # 查看日志
docker compose down           # 停止
```

### 生产部署

| 方式 | 适用场景 | 说明 |
|------|---------|------|
| ECS 自建 PostgreSQL | 单机小规模 | docker-compose 或直接安装 |
| 阿里云 RDS PostgreSQL | 需要高可用 | 管理方便但成本较高 |

## 二、DATABASE_URL 格式

```
postgresql://用户名:密码@主机:端口/数据库名?schema=public
```

示例（本地 Docker）：
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/family_wealth?schema=public"
```

**注意：**
- 本地开发默认用户/密码均为 `postgres`
- 生产环境必须使用强密码
- 不要在 URL 中包含特殊字符时忘记 URL 编码
- 阿里云 RDS 的连接地址通常为 `xxx.pg.rds.aliyuncs.com`

## 三、本地启动步骤

```bash
# 1. 创建 .env
cp .env.example .env

# 2. 启动 PostgreSQL + 初始化数据库
npm run setup:local

# 等价于手动执行：
npm run db:up        # docker compose up -d postgres
npm run db:wait      # 等待就绪
npm run db:generate  # 生成 Prisma Client
npm run db:push      # 推送 schema
npm run db:seed      # 填充种子数据
```

## 四、端口冲突

如果 5432 端口已被占用，修改 `docker-compose.yml`：

```yaml
ports:
  - "5433:5432"   # 宿主端口:容器端口
```

对应修改 `.env` 中 `DATABASE_URL` 的端口。

## 五、常见错误

### Connection refused (ECONNREFUSED)

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**原因：** PostgreSQL 未启动或端口错误。

**解决：**
```bash
npm run db:up              # 启动
docker compose ps           # 检查容器状态
npm run db:logs             # 查看日志
npm run db:doctor           # 运行诊断
```

### Password authentication failed

```
FATAL: password authentication failed for user "postgres"
```

**原因：** DATABASE_URL 中密码与 Docker 配置不匹配。

**解决：** 确保 `.env` 中密码与 `docker-compose.yml` 中 `POSTGRES_PASSWORD` 一致。

### Database does not exist

```
FATAL: database "xxx" does not exist
```

**原因：** 数据库名不匹配或容器未完成初始化。

**解决：**
```bash
docker compose down -v    # 删除旧 volume
npm run db:up             # 重新启动
npm run db:wait           # 等待初始化完成
```

### Port already allocated

```
Error: port is already allocated
```

**原因：** 5432 端口被其他进程占用。

**解决：**
- 修改 `docker-compose.yml` 端口映射
- 或停止占用端口的进程

### Prisma Client not generated

```
Cannot find module '@/generated/prisma/client'
```

**解决：**
```bash
npm run db:generate
```

### Prisma 错误码

| 错误码 | 含义 | 常见原因 |
|--------|------|---------|
| P1001 | 无法连接到数据库 | PostgreSQL 未启动、防火墙、URL 错误 |
| P1000 | 认证失败 | 用户名/密码错误 |
| P1017 | 数据库不存在 | 数据库名错误或未创建 |
| P2021 | 表不存在 | schema 未 push |
| P3000 | Migration 需要创建 | 需要 `prisma migrate dev` |

## 六、数据库重置

```bash
# 完全重置（删除所有数据，重新创建表和 seed）
npm run db:reset
```

等效于：
```bash
npx prisma db push --force-reset && npm run db:seed
```

## 七、诊断命令

```bash
npm run db:doctor          # 完整诊断报告
npm run db:wait            # 等待数据库就绪
npm run db:logs            # 查看 PostgreSQL 容器日志

# 检查容器状态
docker compose ps
docker compose logs postgres --tail 50
```

## 八、阿里云 ECS 注意事项

### 安全组配置

- **不要**在安全组中开放 5432 端口给 0.0.0.0/0
- 仅允许 ECS 内网访问或特定 IP
- Nginx 只代理 3000 端口（应用），不代理 5432（数据库）

### 自建 PostgreSQL

```bash
# ECS 上安装 Docker 后
docker compose up -d
npm run db:wait
npm run db:push
npm run db:seed
npm run build
npm run start
```

### 阿里云 RDS

1. 创建 RDS PostgreSQL 实例
2. 创建数据库 `family_wealth`
3. 创建专用用户并设置强密码
4. 配置白名单（仅 ECS 内网 IP）
5. 修改 `.env` 的 `DATABASE_URL` 为 RDS 连接地址
6. 执行 `npm run db:push && npm run db:seed`

## 九、systemd / PM2 启动前确保数据库可用

### systemd

在 service 文件中：
```
ExecStartPre=/usr/bin/npm run db:wait
ExecStart=/usr/bin/npm run start
```

### PM2

```bash
# 先等待数据库就绪再启动应用
npm run db:wait && pm2 start npm --name "wealth-compass" -- run start
```

### crontab 定时任务

```bash
# 每天 21:30 执行，串联 db:wait 确保数据库可用
30 21 * * 1-5 cd /path/to/app && npm run db:wait && npm run job:daily-valuation >> logs/daily-valuation.log 2>&1
```

## 十、Windows 注意事项

- Docker Desktop 需要启用 WSL 2 或 Hyper-V
- Git Bash 中 `docker` 命令可能需要完整路径
- 端口冲突常见于 Windows 上的其他 PostgreSQL 安装
- `docker compose` 在项目目录下执行，确保 `docker-compose.yml` 存在
