# 阿里云 ECS 部署验收 Runbook

本文档是人工部署验收清单。按步骤执行并逐项确认。

## 前置条件

- 阿里云 ECS 实例 (2C4G+, Ubuntu 22.04/24.04)
- 安全组开放: 22(SSH), 80(HTTP), 443(HTTPS, 可选)
- 域名解析到 ECS IP (如有)
- 本地可 SSH 到服务器

## Phase 1: 服务器准备

- [ ] SSH 登录 ECS
- [ ] `sudo apt update && sudo apt upgrade -y`
- [ ] 安装 Node.js 22: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs`
- [ ] `node --version` → v22.x
- [ ] `sudo npm install -g pm2`
- [ ] 安装 Nginx: `sudo apt-get install -y nginx`
- [ ] 安装 PostgreSQL 16: `sudo apt-get install -y postgresql-16`
- [ ] 安装 git: `sudo apt-get install -y git`

## Phase 2: 克隆代码

```bash
sudo mkdir -p /opt/family-wealth
sudo chown $USER:$USER /opt/family-wealth
git clone https://github.com/KFC-seven/family-wealth-compass.git /opt/family-wealth/app
cd /opt/family-wealth/app
npm ci
```

- [ ] `ls /opt/family-wealth/app` 包含 package.json
- [ ] 创建目录: `mkdir -p /opt/family-wealth/{uploads,logs,backups}`
- [ ] 复制 env: `cp .env.production.example /opt/family-wealth/.env.production`

## Phase 3: 配置环境变量

编辑 `/opt/family-wealth/.env.production`:

```bash
nano /opt/family-wealth/.env.production
```

关键变量 (所有 `CHANGE_ME` 必须替换):

- [ ] `DATABASE_URL` — 数据库连接
- [ ] `SEED_ADMIN_PASSWORD` — 强密码, 不是 ChangeMe123!
- [ ] `JOB_API_SECRET` — `openssl rand -hex 32`
- [ ] `BRIEF_API_SECRET` — `openssl rand -hex 32`
- [ ] `PUSH_API_SECRET` — `openssl rand -hex 32`
- [ ] `UPLOAD_API_SECRET` — `openssl rand -hex 32`
- [ ] `AUTH_ENABLED=true`
- [ ] `NEXT_PUBLIC_USE_API=true`
- [ ] DeepSeek key (如使用)
- [ ] Server 酱 send key (如使用)

## Phase 4: PostgreSQL 初始化

```bash
sudo -u postgres psql -c "CREATE USER family_wealth WITH PASSWORD '强密码';"
sudo -u postgres psql -c "CREATE DATABASE family_wealth OWNER family_wealth;"
```

配置只监听本地:
```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
# listen_addresses = '127.0.0.1'
sudo systemctl restart postgresql
```

- [ ] 更新 `.env.production` 的 DATABASE_URL
- [ ] 防火墙/安全组未开放 5432

## Phase 5: 构建

```bash
cd /opt/family-wealth/app
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run db:doctor
NEXT_PUBLIC_USE_API=true npm run build
```

- [ ] `db:doctor` 通过
- [ ] Build 成功, `.next/standalone/server.js` 存在

## Phase 6: PM2 启动

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
pm2 status
```

- [ ] `pm2 status` 显示 `family-wealth-compass` online
- [ ] `curl http://127.0.0.1:3000/api/health` 返回 ok
- [ ] `pm2 logs family-wealth-compass` 无严重错误

## Phase 7: Nginx 配置

```bash
sudo cp deploy/nginx/family-wealth.conf.example /etc/nginx/sites-available/family-wealth
sudo nano /etc/nginx/sites-available/family-wealth
# 修改 server_name 为实际域名或 IP
sudo ln -s /etc/nginx/sites-available/family-wealth /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

- [ ] `nginx -t` 通过
- [ ] 外部访问 `http://<ECS_IP>` 或域名可打开登录页
- [ ] 安全组开放 80 (和 443)

## Phase 8: HTTPS (可选)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

或使用阿里云 SSL 证书。

- [ ] 浏览器访问 `https://<domain>` 无证书警告
- [ ] 登录后 session cookie 正常
- [ ] `AUTH_REQUIRE_HTTPS=true` 已设置

## Phase 9: 生产 Smoke Test

```bash
cd /opt/family-wealth/app
npm run deploy:check
npm run prod:smoke
npm run db:doctor
npm run providers:doctor
```

- [ ] `deploy:check` 通过
- [ ] `prod:smoke` 通过
- [ ] `db:doctor` 通过
- [ ] `providers:doctor` 通过

## Phase 10: 真实 Provider 验证 (如已配置)

```bash
npm run real-providers:smoke
npm run real-brief:dry-run -- --push
```

- [ ] DeepSeek 调用成功
- [ ] Server 酱收到测试推送
- [ ] 输出无泄露 secret

## Phase 11: 定时任务

```bash
crontab -e
```

```cron
30 21 * * * cd /opt/family-wealth/app && /usr/bin/npm run job:daily-valuation >> /opt/family-wealth/logs/daily-valuation.log 2>&1
0 8 * * * cd /opt/family-wealth/app && /usr/bin/npm run job:morning-brief >> /opt/family-wealth/logs/morning-brief.log 2>&1
0 3 * * * cd /opt/family-wealth/app && /usr/bin/npm run db:backup >> /opt/family-wealth/logs/db-backup.log 2>&1
```

手动执行验证:
```bash
npm run job:daily-valuation
npm run job:morning-brief
npm run db:backup
```

- [ ] JobRun 有记录
- [ ] PriceSnapshot / PortfolioSnapshot 更新
- [ ] DailyBrief 更新
- [ ] backups 目录有 .sql 文件
- [ ] logs 目录有对应日志

## Phase 12: API 模式页面人工验收

浏览器访问 `<域名或IP>`:

- [ ] `/login` — 登录页, 可登录
- [ ] `/` — 首页, API 数据, 图表正常
- [ ] `/members` — 成员列表
- [ ] `/members/[id]` — 成员详情
- [ ] `/holdings` — 持仓列表
- [ ] `/holdings/[id]` — 单仓详情
- [ ] `/import` — 导入页
- [ ] `/brief` — 简报页
- [ ] `/settings` — 设置页, 不显示 secret
- [ ] `/account` — 账户页, 改密/登出正常
- [ ] 刷新页面数据保持
- [ ] 移动端布局正常

## Phase 13: 回滚验证

```bash
# 代码回滚
git log --oneline -5           # 确认要回滚到的 commit
git checkout <commit-hash>
npm ci && npm run build
pm2 restart family-wealth-compass

# 数据库回滚 (谨慎)
npm run db:restore -- backups/family_wealth_YYYY-MM-DD_HHMM.sql

# 配置回滚
cp /opt/family-wealth/.env.production.backup /opt/family-wealth/.env.production
pm2 restart family-wealth-compass
```

- [ ] 回滚步骤记录完毕
- [ ] 恢复后服务可用

---

验收人: ___________  日期: ___________

备注:
