import { loadEnv } from "./utils/load-env.js";
loadEnv();
/**
 * 真实 Provider 人工演练 — 使用当前配置生成+推送简报。
 *
 * 用法:
 *   npm run real-brief:dry-run              # 生成简报 (mock 或真实)
 *   npm run real-brief:dry-run -- --push    # 生成并推送
 *
 * 无真实 key 时使用 mock 并通过。
 */




import { maskSecret, maskWebhook, isSecretConfigured } from "../src/server/security/mask-secret";
import { generateDailyBrief } from "../src/server/brief/brief-generator";
import { getPushProvider } from "../src/server/push/registry";
import { getAiProvider } from "../src/server/ai/registry";

const PASS = "✅";
const WARN = "⚠️";
const FAIL = "❌";

function ok(msg: string) { console.log(`  ${PASS} ${msg}`); }
function warn(msg: string) { console.log(`  ${WARN} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); process.exitCode = 1; }

async function main() {
  const args = process.argv.slice(2);
  const shouldPush = args.includes("--push") || args.includes("-p");
  const dateArg = args.find((a) => a.startsWith("--date="))?.split("=")[1];
  const today = dateArg ?? new Date().toISOString().slice(0, 10);

  console.log(`\n📋 Real Brief Dry Run — ${today}${shouldPush ? " (含推送)" : " (仅生成)"}\n`);

  // ── AI Provider Status ──
  const ai = getAiProvider();
  const aiEnabled = process.env.AI_ENABLED === "true";
  const usingRealAi = ai.name !== "mock";
  console.log(`  AI Provider: ${ai.name}`);
  if (usingRealAi) {
    ok(`真实 AI: ${ai.name} (key=${maskSecret(process.env.DEEPSEEK_API_KEY)})`);
  } else {
    warn("使用 Mock AI，设置 AI_PROVIDER=deepseek + AI_ENABLED=true + DEEPSEEK_API_KEY 启用真实 AI");
  }

  // ── Generate Brief ──
  console.log("\n── Step 1: 生成 DailyBrief ──");
  const startedAt = Date.now();
  let brief;
  try {
    brief = await generateDailyBrief({ date: today, force: true });
    const durationMs = Date.now() - startedAt;
    ok(`简报已生成: ${brief.id} (${durationMs}ms)`);
    console.log(`   标题: ${brief.title}`);
    console.log(`   摘要: ${brief.summary?.slice(0, 100)}`);
    console.log(`   风险提醒: ${Array.isArray(brief.riskAlerts) ? (brief.riskAlerts as any[]).length : 0} 条`);
    console.log(`   建议卡片: ${Array.isArray(brief.adviceCards) ? (brief.adviceCards as any[]).length : 0} 条`);
  } catch (err) {
    fail(`简报生成失败: ${(err as Error).message}`);
    return;
  }

  // ── Push ──
  if (!shouldPush) {
    console.log("\n  💡 使用 --push 参数可同时测试推送\n");
    return;
  }

  console.log("\n── Step 2: 推送简报 ──");
  const push = getPushProvider();
  const pushEnabled = process.env.WECHAT_PUSH_ENABLED === "true";
  const usingRealPush = push.name !== "mock";
  console.log(`  Push Provider: ${push.name}`);

  if (usingRealPush) {
    ok(`真实推送: ${push.name} (webhook=${maskWebhook(process.env.WECHAT_WORK_WEBHOOK_URL)})`);
  } else {
    warn("使用 Mock Push，设置 WECHAT_PUSH_ENABLED=true + WECHAT_PUSH_PROVIDER 启用真实推送");
  }

  try {
    const riskAlerts: any[] = Array.isArray(brief.riskAlerts) ? brief.riskAlerts as any[] : [];
    const adviceCards: any[] = Array.isArray(brief.adviceCards) ? brief.adviceCards as any[] : [];
    const result = await push.sendDailyBrief({
      title: brief.title ?? "每日简报",
      summary: brief.summary ?? "",
      dailyReturn: 0,
      riskAlerts: riskAlerts.map((a: any) => ({ level: a.level ?? "medium", type: a.type ?? "", description: a.description ?? "" })),
      adviceCards: adviceCards.map((c: any) => ({ adviceType: c.adviceType ?? "", relatedMember: c.relatedMember ?? "", relatedAssetName: c.relatedAssetName ?? "", reason: c.reason ?? "" })),
      includeTotalAssets: false,
      includeMemberDetails: false,
      includeAiAdvice: process.env.WECHAT_PUSH_INCLUDE_AI_ADVICE !== "false",
      onlyHighRisk: false,
    });
    if (result.success) ok(`推送完成: ${result.provider} — ${result.message}`);
    else fail(`推送失败: ${result.message}`);
  } catch (err) {
    fail(`推送异常: ${(err as Error).message}`);
  }

  console.log(`\n${process.exitCode ? FAIL : PASS} Dry run 完成\n`);
}

main();
