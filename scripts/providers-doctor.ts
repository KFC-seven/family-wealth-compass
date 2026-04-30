/**
 * Provider 诊断脚本 — 检查所有 provider 配置状态，输出修复建议。
 *
 * 用法: npm run providers:doctor
 * 配置矛盾时 exit non-zero。
 */
import dotenv from "dotenv";
import path from "node:path";
dotenv.config();            // 加载 .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true }); // .env.local 覆盖
import { maskSecret, maskWebhook, isSecretConfigured } from "../src/server/security/mask-secret";

const PASS = "✅";
const SKIP = "⏭️";
const FAIL = "❌";
const WARN = "⚠️";
const INFO = "  ";
let exitCode = 0;

function ok(msg: string) { console.log(`  ${PASS} ${msg}`); }
function skip(msg: string) { console.log(`  ${SKIP} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; }
function warn(msg: string) { console.log(`  ${WARN} ${msg}`); }
function info(msg: string) { console.log(`  ${INFO} ${msg}`); }

async function checkDbStatus() {
  try {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../src/generated/prisma/client");
    const a = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    const p = new PrismaClient({ adapter: a });
    const aiRun = await p.aiGenerationRun.findFirst({ orderBy: { createdAt: "desc" } });
    const pushNotif = await p.pushNotification.findFirst({ orderBy: { createdAt: "desc" } });
    await p.$disconnect();
    return { aiRun, pushNotif };
  } catch {
    return { aiRun: null, pushNotif: null };
  }
}

async function main() {
  console.log("\n🩺 Provider Doctor\n");

  const db = await checkDbStatus();

  // ── AI Provider ──
  console.log("── AI Provider ──");
  const aiProvider = process.env.AI_PROVIDER ?? "mock";
  const aiEnabled = process.env.AI_ENABLED === "true";
  info(`AI_PROVIDER: ${aiProvider}`);
  info(`AI_ENABLED: ${aiEnabled}`);
  info(`AI_MODEL: ${process.env.AI_MODEL ?? "deepseek-chat"}`);

  if (db.aiRun) {
    info(`最近 AiGenerationRun: ${db.aiRun.status} (${db.aiRun.provider}), ${new Date(db.aiRun.createdAt).toLocaleString("zh-CN")}`);
  }

  if (aiProvider === "mock") {
    ok("Mock AI: 始终可用");
    if (aiEnabled) warn("AI_ENABLED=true 但 AI_PROVIDER=mock，将使用 Mock AI");
  } else if (aiProvider === "deepseek") {
    const key = process.env.DEEPSEEK_API_KEY;
    const url = process.env.DEEPSEEK_BASE_URL;
    const configured = isSecretConfigured(key);
    info(`DEEPSEEK_BASE_URL: ${url ?? "未设置"}`);
    info(`DEEPSEEK_API_KEY: ${configured ? "已配置 (" + maskSecret(key) + ")" : "未配置"}`);

    if (!aiEnabled) {
      skip("AI_ENABLED=false, DeepSeek 不会使用");
    } else if (!configured) {
      fail("AI_PROVIDER=deepseek + AI_ENABLED=true 但 DEEPSEEK_API_KEY 未配置");
      info("  修复: 设置 DEEPSEEK_API_KEY 或改为 AI_PROVIDER=mock");
    } else {
      ok(`DeepSeek: 配置完整 (key=${maskSecret(key)})`);
    }
  } else if (aiProvider === "aliyun-bailian") {
    const key = process.env.ALIYUN_BAILIAN_API_KEY;
    const configured = isSecretConfigured(key);
    info(`ALIYUN_BAILIAN_API_KEY: ${configured ? "已配置" : "未配置"}`);
    if (!aiEnabled) skip("AI_ENABLED=false");
    else if (!configured && aiEnabled)
      fail("AI_PROVIDER=aliyun-bailian + AI_ENABLED=true 但 API key 未配置");
    else skip("阿里云百炼: 骨架，真实调用未实现");
  }

  if (aiProvider !== "mock" && !aiEnabled) {
    info("  当前 fallback: MockAiProvider");
  }

  // ── Push Provider ──
  console.log("\n── Push Provider ──");
  const pushProvider = process.env.WECHAT_PUSH_PROVIDER ?? "mock";
  const pushEnabled = process.env.WECHAT_PUSH_ENABLED === "true";
  info(`WECHAT_PUSH_PROVIDER: ${pushProvider}`);
  info(`WECHAT_PUSH_ENABLED: ${pushEnabled}`);
  info(`隐私: 总资产=${process.env.WECHAT_PUSH_INCLUDE_TOTAL_ASSETS === "true" ? "显示" : "隐藏"}, 成员=${process.env.WECHAT_PUSH_INCLUDE_MEMBER_DETAILS === "true" ? "显示" : "隐藏"}`);

  if (db.pushNotif) {
    info(`最近推送: ${db.pushNotif.status} (${db.pushNotif.provider}), ${new Date(db.pushNotif.createdAt).toLocaleString("zh-CN")}`);
  }

  if (pushProvider === "mock") {
    ok("Mock Push: 始终可用");
    if (pushEnabled) warn("WECHAT_PUSH_ENABLED=true 但 WECHAT_PUSH_PROVIDER=mock，将使用 Mock Push");
  } else if (pushProvider === "wecom-bot") {
    const webhook = process.env.WECHAT_WORK_WEBHOOK_URL;
    const configured = isSecretConfigured(webhook);
    info(`WECHAT_WORK_WEBHOOK_URL: ${configured ? "已配置 (" + maskWebhook(webhook) + ")" : "未配置"}`);
    if (!pushEnabled) skip("WECHAT_PUSH_ENABLED=false");
    else if (!configured)
      fail("WECHAT_PUSH_PROVIDER=wecom-bot + WECHAT_PUSH_ENABLED=true 但 webhook 未配置");
    else ok(`WeCom Bot: 配置完整 (webhook=${maskWebhook(webhook)})`);
  } else if (pushProvider === "server-chan") {
    const sendKey = process.env.SERVER_CHAN_SEND_KEY;
    const configured = isSecretConfigured(sendKey);
    info(`SERVER_CHAN_SEND_KEY: ${configured ? "已配置 (" + maskSecret(sendKey) + ")" : "未配置"}`);
    if (!pushEnabled) skip("WECHAT_PUSH_ENABLED=false");
    else if (!configured)
      fail("WECHAT_PUSH_PROVIDER=server-chan + WECHAT_PUSH_ENABLED=true 但 send key 未配置");
    else ok(`Server 酱: 配置完整 (key=${maskSecret(sendKey)})`);
  }

  if (pushProvider !== "mock" && !pushEnabled) {
    info("  当前 fallback: MockPushProvider");
  }

  // ── Market Data ──
  console.log("\n── Market Data ──");
  const marketMode = process.env.MARKET_DATA_MODE ?? "mock";
  info(`MARKET_DATA_MODE: ${marketMode}`);
  const eastmoney = process.env.MARKET_DATA_ENABLE_EASTMONEY_FUND === "true";
  const tushare = process.env.MARKET_DATA_ENABLE_TUSHARE === "true";
  info(`Eastmoney: ${eastmoney ? "启用" : "关闭"}`);
  if (tushare) {
    const token = process.env.TUSHARE_TOKEN;
    const configured = isSecretConfigured(token);
    info(`TUSHARE_TOKEN: ${configured ? "已配置 (" + maskSecret(token) + ")" : "未配置"}`);
    if (!configured) fail("Tushare 启用但 token 未配置");
    else ok("Tushare: 配置完整");
  } else info("Tushare: 关闭");
  ok(marketMode === "mock" ? "Mock 行情: 始终可用" : "Market data: 使用配置模式");

  // ── OCR / Storage ──
  console.log("\n── OCR / Storage ──");
  const ocrProvider = process.env.OCR_PROVIDER ?? "mock";
  const ocrEnabled = process.env.OCR_ENABLED === "true";
  info(`OCR_PROVIDER: ${ocrProvider}, OCR_ENABLED: ${ocrEnabled}`);
  if (ocrProvider === "mock") ok("Mock OCR: 始终可用");
  else skip(`OCR_PROVIDER=${ocrProvider} (${ocrEnabled ? "启用" : "关闭"})`);

  const storageProvider = process.env.UPLOAD_STORAGE_PROVIDER ?? "local";
  info(`UPLOAD_STORAGE_PROVIDER: ${storageProvider}`);
  ok(storageProvider === "local" ? "Local Storage: 可用" : `Storage: ${storageProvider}`);

  // ── Summary ──
  console.log();
  if (exitCode === 0) {
    console.log(`  ${PASS} Provider 诊断完成，配置正确\n`);
    if (aiProvider === "mock" && pushProvider === "mock") {
      console.log("  💡 当前全部使用 Mock provider。配置真实 key 后可运行验证:\n");
      console.log("     详见 docs/architecture/provider-configuration.md\n");
    }
  } else {
    console.log(`  ${FAIL} 发现配置问题，请按上述建议修复\n`);
  }

  process.exit(exitCode);
}

main();
