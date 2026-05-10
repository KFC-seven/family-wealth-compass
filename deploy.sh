#!/usr/bin/env bash
set -euo pipefail

# 家庭财富罗盘 — 一键部署脚本 (在 ECS 服务器上执行)
# 用法: ssh root@106.15.37.44 'bash -s' < deploy.sh

APP_NAME="family-wealth-compass"
PROJECT_DIR="/opt/family-wealth/app"
HEALTH_URL="http://localhost:3000/api/health"
MAX_WAIT=30

red()    { echo -e "\033[31m$1\033[0m"; }
green()  { echo -e "\033[32m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }

echo ""
echo "🚀 家庭财富罗盘 — 生产部署"
echo "============================"
echo ""

cd "$PROJECT_DIR"

# 1. Pull latest code
echo "── [1/6] 拉取代码 ──"
git pull --ff-only
echo ""

# 2. Install dependencies
echo "── [2/6] 安装依赖 ──"
npm ci
echo ""

# 3. Database
echo "── [3/6] 数据库更新 ──"
npm run db:generate
npm run db:push
echo ""

# 4. Build
echo "── [4/6] 构建生产包 ──"
NEXT_PUBLIC_USE_API=true npm run build
echo ""

# 5. Copy static assets (standalone mode)
echo "── [5/7] 静态资源 ──"
cp -r .next/static .next/standalone/.next/static
echo ""

# 6. Restart PM2
echo "── [6/7] 重启服务 ──"
pm2 reload ecosystem.config.cjs --update-env
echo ""

# 7. Health check
echo "── [7/7] 健康检查 ──"
for i in $(seq 1 $MAX_WAIT); do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    green "✅ 部署成功 — $(curl -s "$HEALTH_URL" | grep -o '"ok":[^,}]*')"
    echo ""
    pm2 status "$APP_NAME"
    echo ""
    green "🌐 访问: http://106.15.37.44"
    exit 0
  fi
  sleep 1
done

red "❌ 健康检查超时 ($MAX_WAIT 秒)"
pm2 logs "$APP_NAME" --lines 20 --nostream
exit 1
