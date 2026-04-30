#!/usr/bin/env bash
# 数据库备份脚本
# 用法: bash scripts/backup-db.sh

set -euo pipefail

# 读取 .env 文件（如果存在 .env.production，优先使用）
if [ -f .env.production ]; then
  export $(grep -v '^#' .env.production | grep -v '^\s*$' | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^\s*$' | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL 未设置"
  exit 1
fi

mkdir -p backups

FILENAME="family_wealth_$(date +%F_%H%M).sql"
FILEPATH="backups/$FILENAME"

echo "📦 备份数据库到 $FILEPATH ..."
pg_dump "$DATABASE_URL" > "$FILEPATH"

if [ $? -eq 0 ]; then
  echo "✅ 备份完成: $FILEPATH ($(du -h "$FILEPATH" | cut -f1))"
else
  echo "❌ 备份失败"
  rm -f "$FILEPATH"
  exit 1
fi

# 保留最近 7 天的备份
ls -t backups/family_wealth_*.sql 2>/dev/null | tail -n +8 | xargs -r rm
echo "   已清理旧备份（保留最近7份）"
