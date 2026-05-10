/**
 * 启用真实行情数据源（天天基金 + 新浪财经）。
 *
 * 用法:
 *   npx tsx scripts/enable-real-market-data.ts          # 启用
 *   npx tsx scripts/enable-real-market-data.ts --dry-run # 仅检查不修改
 */
import { loadEnv } from "./utils/load-env.js";
loadEnv();
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(`\n📡 启用真实行情数据源${dryRun ? " (dry-run)" : ""}\n`);

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 未设置");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();
    console.log("✅ 数据库已连接\n");
  } catch (err) {
    console.error("❌ 数据库连接失败:", (err as Error).message);
    process.exit(1);
  }

  const sources = [
    { name: "eastmoney-fund", display: "天天基金" },
    { name: "sina-finance", display: "新浪财经" },
  ];

  for (const { name, display } of sources) {
    const existing = await prisma.marketDataSource.findFirst({ where: { name } });

    if (!existing) {
      console.log(`⚠️  ${display} (${name}): 数据源不存在，请先运行 seed`);
      continue;
    }

    if (existing.isEnabled) {
      console.log(`✅ ${display} (${name}): 已启用 (priority=${existing.priority})`);
      continue;
    }

    if (dryRun) {
      console.log(`🔍 ${display} (${name}): 将被启用 (当前 disabled, priority=${existing.priority})`);
    } else {
      await prisma.marketDataSource.update({
        where: { id: existing.id },
        data: { isEnabled: true, lastStatus: "HEALTHY" },
      });
      console.log(`✅ ${display} (${name}): 已启用 (priority=${existing.priority})`);
    }
  }

  // Show all enabled sources
  console.log("\n── 当前所有数据源状态 ──");
  const all = await prisma.marketDataSource.findMany({ orderBy: { priority: "asc" } });
  for (const s of all) {
    const icon = s.isEnabled ? "✅" : "⏸️";
    console.log(`  ${icon} ${s.displayName} (${s.name}) priority=${s.priority} [${s.lastStatus}]`);
  }

  console.log(`\n${dryRun ? "💡 移除 --dry-run 以实际执行\n" : "✅ 完成\n"}`);

  await prisma.$disconnect();
  process.exit(0);
}

main();
