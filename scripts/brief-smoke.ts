/**
 * Brief smoke test — 验证 AI 简报生成 + 推送全链路（service-level）。
 *
 * 用法: npm run brief:smoke
 * 不依赖真实 AI key 或微信 webhook。
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateDailyBrief } from "../src/server/brief/brief-generator";
import { getPushProvider } from "../src/server/push/registry";
import { decimalToNumber } from "../src/server/finance/mappers";
import { checkSafety } from "../src/server/ai/safety";

const PASS = "✅";
const FAIL = "❌";
let exitCode = 0;
function ok(msg: string) { console.log(`  ${PASS} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; }

async function main() {
  console.log("\n🧪 Brief Smoke Test — service-level\n");

  if (!process.env.DATABASE_URL) { fail("DATABASE_URL 未设置"); process.exit(1); }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();
  ok("数据库连接成功");

  const household = await prisma.household.findFirst();
  if (!household) { fail("无 Household"); process.exit(1); }

  // Step 1: Generate brief
  console.log("\n--- Step 1: 生成 DailyBrief ---");
  const today = new Date().toISOString().slice(0, 10);
  const brief = await generateDailyBrief({ date: today, force: true });
  ok(`DailyBrief 已生成: ${brief.id}`);

  // Step 2: Verify structure
  console.log("\n--- Step 2: 验证简报结构 ---");
  const checks = [
    { field: "title", ok: !!brief.title, val: brief.title },
    { field: "summary", ok: !!brief.summary, val: brief.summary?.slice(0, 50) },
    { field: "marketOverview", ok: Array.isArray(brief.marketOverview), val: `${(brief.marketOverview as any[]).length} 条` },
    { field: "householdImpact", ok: !!brief.householdImpact },
    { field: "memberImpacts", ok: Array.isArray(brief.memberImpacts), val: `${(brief.memberImpacts as any[]).length} 条` },
    { field: "riskAlerts", ok: Array.isArray(brief.riskAlerts), val: `${(brief.riskAlerts as any[]).length} 条` },
    { field: "adviceCards", ok: Array.isArray(brief.adviceCards), val: `${(brief.adviceCards as any[]).length} 条` },
    { field: "newsItems", ok: Array.isArray(brief.newsItems), val: `${(brief.newsItems as any[]).length} 条` },
  ];
  for (const c of checks) {
    if (c.ok) ok(`${c.field}: ${c.val ?? "—"}`);
    else fail(`${c.field}: 缺失`);
  }

  // Step 3: Safety check
  console.log("\n--- Step 3: 安全检查 ---");
  const output = {
    title: brief.title ?? "",
    summary: brief.summary ?? "",
    marketOverview: (brief.marketOverview as any[]) ?? [],
    householdImpact: brief.householdImpact as any,
    memberImpacts: (brief.memberImpacts as any[]) ?? [],
    riskAlerts: (brief.riskAlerts as any[]) ?? [],
    adviceCards: (brief.adviceCards as any[]) ?? [],
    newsItems: (brief.newsItems as any[]) ?? [],
    disclaimer: "以上内容为基于持仓数据和公开信息的辅助分析，不构成确定性投资指令。",
  };
  const safety = checkSafety(output as any);
  if (safety.passed) ok("安全检查通过");
  else {
    safety.issues.forEach((i) => fail(`禁止内容: ${i}`));
  }

  // Step 4: AiGenerationRun
  console.log("\n--- Step 4: 验证 AiGenerationRun ---");
  const aiRun = await prisma.aiGenerationRun.findFirst({ orderBy: { createdAt: "desc" } });
  if (aiRun) ok(`AiGenerationRun: status=${aiRun.status}, provider=${aiRun.provider}, duration=${aiRun.durationMs}ms`);
  else fail("AiGenerationRun 未写入");

  // Step 5: Push
  console.log("\n--- Step 5: Mock 推送 ---");
  const provider = getPushProvider();
  const riskAlerts: any[] = Array.isArray(brief.riskAlerts) ? brief.riskAlerts as any[] : [];
  const adviceCards: any[] = Array.isArray(brief.adviceCards) ? brief.adviceCards as any[] : [];
  const snap = await prisma.portfolioSnapshot.findFirst({
    where: { householdId: household.id, scopeType: "HOUSEHOLD" },
    orderBy: { date: "desc" },
  });

  const pushResult = await provider.sendDailyBrief({
    title: brief.title ?? "简报",
    summary: brief.summary ?? "",
    dailyReturn: snap ? decimalToNumber(snap.dailyReturn) : 0,
    riskAlerts: riskAlerts.map((a: any) => ({ level: a.level ?? "medium", type: a.type ?? "", description: a.description ?? "" })),
    adviceCards: adviceCards.map((c: any) => ({ adviceType: c.adviceType ?? "", relatedMember: c.relatedMember ?? "", relatedAssetName: c.relatedAssetName ?? "", reason: c.reason ?? "" })),
    includeTotalAssets: false, includeMemberDetails: false, includeAiAdvice: true, onlyHighRisk: false,
  });
  if (pushResult.success) ok(`推送成功: ${pushResult.provider} — ${pushResult.message}`);
  else fail(`推送失败: ${pushResult.message}`);

  // Step 6: PushNotification
  console.log("\n--- Step 6: 验证 PushNotification ---");
  const pushNotif = await prisma.pushNotification.findFirst({ orderBy: { createdAt: "desc" } });
  if (pushNotif) ok(`PushNotification: status=${pushNotif.status}, provider=${pushNotif.provider}`);
  else fail("PushNotification 未写入");

  await prisma.$disconnect();

  if (exitCode === 0) console.log(`\n${PASS} Brief smoke test 全部通过\n`);
  else console.log(`\n${FAIL} Brief smoke test 存在问题\n`);
  process.exit(exitCode);
}

main();
