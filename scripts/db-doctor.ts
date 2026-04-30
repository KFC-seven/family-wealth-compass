import { loadEnv } from "./utils/load-env.js";
loadEnv();
/**
 * 数据库诊断脚本 — 检查 PostgreSQL 连接、schema、seed 数据完整性。
 *
 * 用法:
 *   npx tsx scripts/db-doctor.ts
 *
 * 全部通过 exit code = 0，失败非 0。
 */





import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const PASS = "✅";
const FAIL = "❌";
const WARN = "⚠️";

let exitCode = 0;

function ok(msg: string) { console.log(`  ${PASS} ${msg}`); }
function warn(msg: string) { console.log(`  ${WARN} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; }

function parseDbUrl(url: string) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: u.port || "5432", database: u.pathname.replace(/^\//, ""), user: decodeURIComponent(u.username) };
  } catch { return { host: "?", port: "?", database: "?", user: "?" }; }
}

async function main() {
  console.log("\n🏥 Family Wealth Compass — 数据库诊断\n");

  // 1. DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    fail("DATABASE_URL 未设置");
    console.error("   请复制 .env.example 为 .env 并配置 DATABASE_URL。");
    process.exit(1);
  }
  const info = parseDbUrl(dbUrl);
  ok(`DATABASE_URL 已设置 (host=${info.host}, port=${info.port}, db=${info.database})`);

  // 2. 连接测试
  let prisma: PrismaClient;
  try {
    const adapter = new PrismaPg({ connectionString: dbUrl });
    prisma = new PrismaClient({ adapter });
    const start = Date.now();
    await prisma.$connect();
    const latencyMs = Date.now() - start;
    ok(`数据库连接成功 (latency=${latencyMs}ms)`);
  } catch (err) {
    fail(`数据库连接失败: ${(err as Error).message}`);
    console.error(`   建议: npm run db:up (启动 PostgreSQL)`);
    console.error(`         npm run db:logs (查看容器日志)`);
    process.exit(1);
  }

  // 3. Prisma Client
  try {
    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const tableNames = tables.map((t) => t.tablename);
    ok(`Prisma Client 正常工作，发现 ${tables.length} 个表`);
    for (const t of tableNames) {
      console.log(`      - ${t}`);
    }
  } catch (err) {
    fail(`查询表列表失败: ${(err as Error).message}`);
  }

  // 4. 关键表检查
  const keyTables = [
    "Household", "Member", "Account", "Asset", "Holding",
    "Transaction", "PriceSnapshot", "PortfolioSnapshot",
    "InvestorProfile", "AppSettings", "DailyBrief",
    "ScheduledJob", "JobRun", "MarketDataSource",
  ];
  for (const table of keyTables) {
    try {
      const count = await (prisma as any)[lowerFirst(table)].count();
      if (count > 0) ok(`${table}: ${count} 条记录`);
      else warn(`${table}: 0 条记录（可能未 seed）`);
    } catch {
      warn(`${table}: 表不存在或不可查询`);
    }
  }

  // 5. Seed 关键数据检查
  try {
    const household = await prisma.household.findFirst();
    if (household) ok(`Household 存在: "${household.name}"`);
    else fail("无 Household 数据，请运行 npm run db:seed");
  } catch { fail("Household 查询失败"); }

  try {
    const members = await prisma.member.count();
    if (members >= 3) ok(`Member: ${members} 人 (>=3)`);
    else warn(`Member: ${members} 人 (期望 >=3)`);
  } catch { fail("Member 查询失败"); }

  try {
    const assets = await prisma.asset.count();
    if (assets >= 10) ok(`Asset: ${assets} 个 (>=10)`);
    else warn(`Asset: ${assets} 个 (期望 >=10)`);
  } catch { fail("Asset 查询失败"); }

  // 6. Phase 8 数据检查
  try {
    const jobs = await prisma.scheduledJob.count();
    if (jobs >= 4) ok(`ScheduledJob: ${jobs} 个 (>=4)`);
    else warn(`ScheduledJob: ${jobs} 个 (期望 >=4)`);
  } catch { warn("ScheduledJob 查询失败（可能 Phase 8 schema 未 push）"); }

  try {
    const sources = await prisma.marketDataSource.count();
    if (sources >= 4) ok(`MarketDataSource: ${sources} 个 (>=4)`);
    else warn(`MarketDataSource: ${sources} 个 (期望 >=4)`);
  } catch { warn("MarketDataSource 查询失败（可能 Phase 8 schema 未 push）"); }

  // 7. 快照检查
  try {
    const priceCount = await prisma.priceSnapshot.count();
    const portfolioCount = await prisma.portfolioSnapshot.count();
    if (priceCount > 0) ok(`PriceSnapshot: ${priceCount} 条`);
    else warn("PriceSnapshot: 0 条");
    if (portfolioCount > 0) ok(`PortfolioSnapshot: ${portfolioCount} 条`);
    else warn("PortfolioSnapshot: 0 条（可运行 npm run job:daily-valuation 生成）");
  } catch { warn("快照查询失败"); }

  // 8. JobRun 检查
  try {
    const runs = await prisma.jobRun.count();
    ok(`JobRun: ${runs} 条记录`);
  } catch { warn("JobRun 查询失败"); }

  await prisma.$disconnect();

  console.log(`\n${exitCode === 0 ? "✅ 诊断通过" : "❌ 发现问题，请按上述建议修复"}\n`);
  process.exit(exitCode);
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

main();
