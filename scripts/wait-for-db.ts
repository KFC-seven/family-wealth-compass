/**
 * 等待 PostgreSQL 可用。
 *
 * 用法:
 *   npx tsx scripts/wait-for-db.ts [maxRetries] [intervalMs]
 *
 * 默认最多重试 30 次，每次间隔 2 秒（共 60 秒）。
 * 通过 DATABASE_URL 环境变量连接。
 */

import "dotenv/config";
import { Pool } from "pg";

const MAX_RETRIES = parseInt(process.argv[2] || "30", 10);
const INTERVAL_MS = parseInt(process.argv[3] || "2000", 10);

function parseDbUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || "5432",
      database: u.pathname.replace(/^\//, ""),
      user: decodeURIComponent(u.username),
    };
  } catch {
    return { host: "unknown", port: "5432", database: "unknown", user: "unknown" };
  }
}

async function tryConnect(dbUrl: string): Promise<boolean> {
  const pool = new Pool({ connectionString: dbUrl, max: 1 });
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL 未设置。请在 .env 中配置。");
    process.exit(1);
  }

  const info = parseDbUrl(dbUrl);
  console.log(`⏳ 等待 PostgreSQL 就绪...`);
  console.log(`   Host: ${info.host}:${info.port}`);
  console.log(`   Database: ${info.database}`);
  console.log(`   User: ${info.user}`);
  console.log(`   最多重试 ${MAX_RETRIES} 次，间隔 ${INTERVAL_MS}ms\n`);

  for (let i = 1; i <= MAX_RETRIES; i++) {
    const connected = await tryConnect(dbUrl);
    if (connected) {
      console.log(`✅ PostgreSQL 已就绪 (尝试 ${i}/${MAX_RETRIES})`);
      process.exit(0);
    }
    if (i < MAX_RETRIES) {
      process.stdout.write(`\r   尝试 ${i}/${MAX_RETRIES} — 等待中...`);
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    }
  }

  console.error(`\n❌ PostgreSQL 在 ${MAX_RETRIES} 次尝试后仍未就绪。`);
  console.error(`   Host: ${info.host}:${info.port}`);
  console.error(`   Database: ${info.database}`);
  console.error(`\n   建议操作:`);
  console.error(`   1. 启动 PostgreSQL:  npm run db:up`);
  console.error(`   2. 查看日志:          npm run db:logs`);
  console.error(`   3. 运行诊断:          npm run db:doctor`);
  process.exit(1);
}

main();
