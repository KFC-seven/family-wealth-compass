# 安全硬化清单

## 认证

- [ ] `AUTH_ENABLED=true` 必须开启
- [ ] 修改 `SEED_ADMIN_PASSWORD` 默认值
- [ ] `AUTH_REQUIRE_HTTPS=true`（如有 HTTPS）
- [ ] `AUTH_DEV_ALLOW_SEED_LOGIN=false`

## 密钥

- [ ] `JOB_API_SECRET` 设置强随机值
- [ ] `BRIEF_API_SECRET` 设置强随机值
- [ ] `PUSH_API_SECRET` 设置强随机值
- [ ] `UPLOAD_API_SECRET` 设置强随机值
- [ ] 所有密钥不在日志中输出
- [ ] 所有密钥不在代码仓库中提交（使用 .env.production 本地管理）
- [ ] 生成强随机值: `openssl rand -base64 32`

## 网络

- [ ] Nginx 只开放 80/443
- [ ] PostgreSQL 5432 不公网暴露
- [ ] Node.js 3000 只监听 127.0.0.1（通过 Nginx 反向代理）
- [ ] 阿里云安全组最小化：22(SSH)、80(HTTP)、443(HTTPS)
- [ ] SSH 使用密钥登录，禁用密码登录

## 数据

- [ ] uploads/ 不通过 Nginx 公开为静态目录
- [ ] 不公开 Prisma Studio
- [ ] 数据库备份定期执行
- [ ] 备份文件复制到安全位置（非同一台服务器）
- [ ] uploads/logs/backups 在 .gitignore

## HTTPS

- [ ] 使用 Let's Encrypt (certbot) 或阿里云 SSL 证书
- [ ] 配置完成后设置 `AUTH_REQUIRE_HTTPS=true`
- [ ] HSTS 头（可选）

## 日志

- [ ] 不在日志中输出密码、token、secret
- [ ] 日志定期轮转或清理
- [ ] PM2/systemd 日志分开

## 依赖

- [ ] `npm audit` 定期检查
- [ ] 定期更新依赖安全补丁

## 调试接口

- [ ] 生产环境禁用 Prisma Studio
- [ ] API smoke test 不应在公网可访问的端点输出内部信息
- [ ] /api/health 仅返回基本状态，不返回内部配置详情

## 运维

- [ ] 定期检查 `deploy:check` 输出
- [ ] 监控磁盘空间（uploads、logs、backups）
- [ ] 监控 PostgreSQL 连接数
- [ ] 配置 PM2 自动重启和内存限制
