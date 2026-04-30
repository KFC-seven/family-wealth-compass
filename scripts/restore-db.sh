#!/usr/bin/env bash
# 数据库恢复脚本
# 用法: bash scripts/restore-db.sh backups/family_wealth_2026-01-01_0300.sql

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "用法: bash scripts/restore-db.sh <备份文件路径>"
  echo "示例: bash scripts/restore-db.sh backups/family_wealth_2026-01-01_0300.sql"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ 备份文件不存在: $BACKUP_FILE"
  exit 1
fi

# 读取 DATABASE_URL
if [ -f .env.production ]; then
  export $(grep -v '^#' .env.production | grep -v '^\s*$' | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^\s*$' | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL 未设置"
  exit 1
fi

# 确认操作
echo "⚠  即将恢复数据库: $BACKUP_FILE"
echo "   目标: ${DATABASE_URL%%\?*}"
read -p "   确认恢复？输入 yes 继续: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "   已取消"
  exit 0
fi

echo "📥 恢复数据库 ..."
psql "$DATABASE_URL" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ 恢复完成"
else
  echo "❌ 恢复失败"
  exit 1
fi
