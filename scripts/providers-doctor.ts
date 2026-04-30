/**
 * Provider 诊断脚本 — 检查所有外部 provider 的配置状态。
 *
 * 用法: npm run providers:doctor
 * 不依赖真实 key，全 SKIP 时 exit 0。
 */
import "dotenv/config";

const PASS = "✅";
const SKIP = "⏭️";
const FAIL = "❌";
const INFO = "ℹ️";
let exitCode = 0;

function ok(msg: string) { console.log(`  ${PASS} ${msg}`); }
function skip(msg: string) { console.log(`  ${SKIP} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; }
function info(msg: string) { console.log(`  ${INFO} ${msg}`); }

function checkSecret(name: string, val: string | undefined): boolean {
  if (!val || val.length === 0) return false;
  if (val === "CHANGE_ME") return false;
  return true;
}

async function main() {
  console.log("\n🩺 Provider Doctor\n");

  // ── AI Provider ──
  console.log("── AI Provider ──");
  const aiProvider = process.env.AI_PROVIDER ?? "mock";
  const aiEnabled = process.env.AI_ENABLED === "true";
  info(`AI_PROVIDER: ${aiProvider}`);
  info(`AI_ENABLED: ${aiEnabled}`);

  if (aiProvider === "mock") {
    ok("Mock AI: 始终可用");
  } else if (aiProvider === "deepseek") {
    const key = process.env.DEEPSEEK_API_KEY;
    const url = process.env.DEEPSEEK_BASE_URL;
    const model = process.env.AI_MODEL ?? "deepseek-chat";
    const hasKey = checkSecret("DEEPSEEK_API_KEY", key);
    info(`DEEPSEEK_BASE_URL: ${url}`);
    info(`AI_MODEL: ${model}`);
    info(`DEEPSEEK_API_KEY: ${hasKey ? "已配置" : "未配置"}`);
    if (!aiEnabled) skip("AI_ENABLED=false, 不会使用 DeepSeek");
    else if (!hasKey) skip("DEEPSEEK_API_KEY 未配置");
    else ok("DeepSeek: 配置完整, provider 可启用");
  } else if (aiProvider === "aliyun-bailian") {
    const key = process.env.ALIYUN_BAILIAN_API_KEY;
    if (!checkSecret("ALIYUN_BAILIAN_API_KEY", key)) skip("阿里云百炼: API key 未配置 (骨架)");
    else ok("阿里云百炼: key 已配置");
  } else {
    skip(`AI_PROVIDER=${aiProvider} — 未知 provider`);
  }

  // ── Push Provider ──
  console.log("\n── Push Provider ──");
  const pushProvider = process.env.WECHAT_PUSH_PROVIDER ?? "mock";
  const pushEnabled = process.env.WECHAT_PUSH_ENABLED === "true";
  info(`WECHAT_PUSH_PROVIDER: ${pushProvider}`);
  info(`WECHAT_PUSH_ENABLED: ${pushEnabled}`);

  if (pushProvider === "mock") {
    ok("Mock Push: 始终可用");
  } else if (pushProvider === "wecom-bot") {
    const webhook = process.env.WECHAT_WORK_WEBHOOK_URL;
    const hasHook = checkSecret("WECHAT_WORK_WEBHOOK_URL", webhook);
    info(`WECHAT_WORK_WEBHOOK_URL: ${hasHook ? "已配置" : "未配置"}`);
    if (!pushEnabled) skip("WECHAT_PUSH_ENABLED=false, 不会使用 WeCom");
    else if (!hasHook) skip("WECHAT_WORK_WEBHOOK_URL 未配置");
    else ok("WeCom Bot: 配置完整, provider 可启用");
  } else if (pushProvider === "server-chan") {
    const sendKey = process.env.SERVER_CHAN_SEND_KEY;
    const hasKey = checkSecret("SERVER_CHAN_SEND_KEY", sendKey);
    info(`SERVER_CHAN_SEND_KEY: ${hasKey ? "已配置" : "未配置"}`);
    if (!pushEnabled) skip("WECHAT_PUSH_ENABLED=false, 不会使用 Server 酱");
    else if (!hasKey) skip("SERVER_CHAN_SEND_KEY 未配置");
    else ok("Server 酱: 配置完整, provider 可启用");
  } else {
    skip(`WECHAT_PUSH_PROVIDER=${pushProvider} — 未知 provider`);
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
    if (!checkSecret("TUSHARE_TOKEN", token)) skip("Tushare: token 未配置");
    else ok("Tushare: token 已配置");
  } else {
    info("Tushare: 关闭");
  }
  ok("Mock 行情: 始终可用");

  // ── OCR / Storage ──
  console.log("\n── OCR / Storage ──");
  const ocrProvider = process.env.OCR_PROVIDER ?? "mock";
  info(`OCR_PROVIDER: ${ocrProvider}`);
  const ocrEnabled = process.env.OCR_ENABLED === "true";
  if (ocrProvider === "mock") ok("Mock OCR: 始终可用");
  else if (ocrProvider === "aliyun" && !ocrEnabled) skip("Aliyun OCR: 未启用");
  else skip(`OCR_PROVIDER=${ocrProvider}`);

  const storageProvider = process.env.UPLOAD_STORAGE_PROVIDER ?? "local";
  info(`UPLOAD_STORAGE_PROVIDER: ${storageProvider}`);
  ok("Local Storage: 始终可用");

  if (storageProvider === "aliyun-oss") {
    const hasOss = checkSecret("ALIYUN_ACCESS_KEY_ID", process.env.ALIYUN_ACCESS_KEY_ID);
    if (!hasOss) skip("Aliyun OSS: key 未配置 (骨架)");
    else ok("Aliyun OSS: key 已配置");
  }

  // ── Summary ──
  if (exitCode === 0) {
    console.log(`\n${PASS} Provider 诊断完成 (配置错误 0)\n`);
  } else {
    console.log(`\n${FAIL} 发现配置问题，请检查\n`);
  }

  process.exit(exitCode);
}

main();
