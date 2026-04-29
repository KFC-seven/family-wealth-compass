# 中国大陆部署指南

## 阿里云 ECS 推荐运行方式

### 实例规格
- 最低配置：2C4G（ECS 突发性能实例 t6 或通用型 g7）
- 推荐配置：2C8G（如需同时运行 PostgreSQL）
- 系统盘：40GB 足够

### 操作系统
- Ubuntu 22.04 LTS 或 Debian 12

## Node.js 版本

推荐 Node.js 22 LTS（当前项目已验证兼容）。

```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22
nvm use 22
```

## PostgreSQL 三种选择

### 1. 本地 Docker PostgreSQL（推荐开发）
```bash
docker compose up -d
```

### 2. ECS 自建 PostgreSQL
```bash
apt install postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
sudo -u postgres createdb family_wealth
```

### 3. 阿里云 RDS PostgreSQL
- 在 RDS 控制台创建 PostgreSQL 实例
- 获取内网连接地址
- 安全组放通 ECS 到 RDS 的 5432 端口

## 端口规划

| 服务 | 端口 | 说明 |
|------|------|------|
| Next.js | 3000 | 应用服务 |
| PostgreSQL | 5432 | 数据库（不公网暴露） |
| Nginx | 80/443 | 反向代理和 HTTPS |

## Nginx 反向代理（占位）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## HTTPS 证书（占位）

建议使用 Let's Encrypt / certbot 或阿里云 SSL 证书服务。

## 进程守护

### PM2（推荐）
```bash
npm install -g pm2
pm2 start npm --name "family-wealth" -- start
pm2 save
pm2 startup
```

### systemd
```ini
[Unit]
Description=Family Wealth Compass
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/family-wealth
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://...

[Install]
WantedBy=multi-user.target
```

## Next.js standalone 部署

```bash
# 构建
npm run build

# 产物在 .next/standalone/
# 复制到部署目录
cp -r .next/standalone /opt/family-wealth
cp -r .next/static /opt/family-wealth/.next/static
cp -r public /opt/family-wealth

# 启动
node /opt/family-wealth/server.js
```

## 国内 npm registry 设置

```bash
# 临时使用
npm install --registry=https://registry.npmmirror.com

# 或写入 .npmrc
echo "registry=https://registry.npmmirror.com" >> .npmrc
```

## 安全组建议

| 方向 | 端口 | 协议 | 说明 |
|------|------|------|------|
| 入站 | 443 | TCP | HTTPS |
| 入站 | 80 | TCP | HTTP（重定向到 HTTPS）|
| 入站 | 22 | TCP | SSH（限制 IP）|
| 出站 | 全部 | 全部 | 出站流量 |

**数据库端口（5432）不要公网暴露。**

## 备份策略

- 数据库每日备份：`pg_dump -U postgres family_wealth > backup_$(date +%Y%m%d).sql`
- 备份保留 7 天
- 后续截图存储建议使用阿里云 OSS

## 后续集成方向

| 能力 | 推荐方案 |
|------|---------|
| 文件存储 | 阿里云 OSS |
| OCR | 阿里云 OCR / PaddleOCR |
| AI | DeepSeek API / 阿里云百炼（通义千问）|
| 推送 | 企业微信群机器人 / Server 酱 |
| 行情 | 待定国内数据源 |
