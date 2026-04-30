# PostgreSQL 生产部署与硬化

## ECS 自建 PostgreSQL

### 创建用户和数据库

```sql
-- 以 postgres 用户连接
sudo -u postgres psql

-- 创建专用用户（不要用 postgres）
CREATE USER family_wealth WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE family_wealth OWNER family_wealth;
GRANT ALL PRIVILEGES ON DATABASE family_wealth TO family_wealth;

-- schema public 权限
\c family_wealth
GRANT ALL ON SCHEMA public TO family_wealth;
```

### 只监听本地

`postgresql.conf`:
```
listen_addresses = '127.0.0.1'
```

`pg_hba.conf`:
```
# 仅允许本地连接
host    all             all             127.0.0.1/32            scram-sha-256
```

### 防火墙

```bash
# 确保 5432 不对外部开放
sudo ufw deny 5432/tcp
# 或阿里云安全组：不开放 5432 端口
```

### 修改默认 postgres 密码

```sql
ALTER USER postgres WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
```

## 阿里云 RDS PostgreSQL

### 连接配置

`.env.production` 中修改 DATABASE_URL:
```
DATABASE_URL="postgresql://family_wealth:CHANGE_ME@xxx.pg.rds.aliyuncs.com:5432/family_wealth?schema=public"
```

### 安全要求

- RDS 白名单仅允许 ECS 内网 IP
- 不开通公网访问
- 使用 SSL 连接（`?sslmode=require`）

## 备份与恢复

### 备份

```bash
npm run db:backup
# 或直接: bash scripts/backup-db.sh
```

备份文件在 `backups/family_wealth_YYYY-MM-DD_HHMM.sql`

### 恢复

```bash
npm run db:restore -- backups/family_wealth_2026-01-01_0300.sql
# 或直接: bash scripts/restore-db.sh backups/file.sql
```

### 定时备份 (crontab)

```cron
# 每天凌晨 3 点备份
0 3 * * * cd /opt/family-wealth && /usr/bin/npm run db:backup >> logs/db-backup.log 2>&1
```

## 安全要点

- 不公网暴露 5432 端口
- 使用强密码
- 定期备份并复制到安全位置
- 不在代码仓库中保存真实数据库密码
- 生产数据库用户只给最小必要权限
