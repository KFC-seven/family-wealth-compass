# 生产部署指南 — 阿里云 ECS

推荐路径 A：ECS + 本机 PostgreSQL，适合家庭自用，成本低。

## 1. 服务器准备

### 阿里云 ECS 实例

- 最低配置：2C4G，建议 2C8G
- 系统：Ubuntu 22.04 LTS / 24.04 LTS
- 安全组开放：22 (SSH)、80 (HTTP)、443 (HTTPS)
- **不要开放 5432（数据库）**

### 安装基础软件

```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 16
sudo apt-get install -y postgresql-16

# Nginx
sudo apt-get install -y nginx

# PM2
sudo npm install -g pm2

# Git
sudo apt-get install -y git
```

## 2. PostgreSQL 配置

见 `deploy/postgres/postgres-hardening.md`。

```bash
sudo -u postgres psql
CREATE USER family_wealth WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE family_wealth OWNER family_wealth;
```

配置只监听 127.0.0.1：
```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
# listen_addresses = '127.0.0.1'
sudo systemctl restart postgresql
```

## 3. 拉取代码

```bash
cd /opt
git clone https://github.com/KFC-seven/family-wealth-compass.git family-wealth
cd family-wealth
npm ci
```

## 4. 配置环境变量

```bash
cp .env.production.example .env.production
nano .env.production
# 修改所有 CHANGE_ME 值
# 生产必须: AUTH_ENABLED=true, 修改 SEED_ADMIN_PASSWORD
```

## 5. 初始化数据库

```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run db:doctor
```

## 6. 构建

```bash
npm run build
# standalone 输出在 .next/standalone/
```

## 7. 启动 (PM2)

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup  # 开机自启
```

验证：
```bash
curl http://127.0.0.1:3000/api/health
```

## 8. 配置 Nginx

```bash
sudo cp deploy/nginx/family-wealth.conf.example /etc/nginx/sites-available/family-wealth
sudo nano /etc/nginx/sites-available/family-wealth  # 修改 server_name
sudo ln -s /etc/nginx/sites-available/family-wealth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 9. 配置 HTTPS（可选但推荐）

```bash
# certbot
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```

获取证书后，取消 Nginx HTTPS 部分的注释。

## 10. 配置定时任务 (crontab)

```bash
crontab -e
```

```cron
# 每天 21:30 执行估值
30 21 * * * cd /opt/family-wealth && /usr/bin/npm run job:daily-valuation >> logs/daily-valuation.log 2>&1

# 每天 08:00 生成并推送晨报
0 8 * * * cd /opt/family-wealth && /usr/bin/npm run job:morning-brief >> logs/morning-brief.log 2>&1

# 每天 03:00 备份数据库
0 3 * * * cd /opt/family-wealth && /usr/bin/npm run db:backup >> logs/db-backup.log 2>&1
```

## 11. 验收

```bash
npm run deploy:check
npm run db:doctor
npm run auth:smoke
npm run import:smoke
npm run brief:smoke
npm run api:smoke
```

## 12. 回滚和排障

```bash
pm2 logs family-wealth-compass       # 应用日志
sudo tail -f /var/log/nginx/error.log # Nginx 日志
sudo tail -f /var/log/postgresql/*.log # PostgreSQL 日志

pm2 restart family-wealth-compass    # 重启应用
sudo systemctl restart nginx          # 重启 Nginx
sudo systemctl restart postgresql     # 重启 PostgreSQL
```

数据库恢复：
```bash
npm run db:restore -- backups/family_wealth_YYYY-MM-DD_HHMM.sql
```

## 路径 B: ECS + 阿里云 RDS

- 创建 RDS PostgreSQL 实例
- 配置白名单（仅 ECS 内网 IP）
- 不开通公网访问
- DATABASE_URL 改为 RDS 连接地址
- 备份可用 RDS 自动备份 + 手动备份双保障
- 其余步骤同路径 A
