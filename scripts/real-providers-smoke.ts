import { loadEnv } from "./utils/load-env.js";
loadEnv();
/**
 * Real provider smoke test — 仅在环境变量完整时执行真实调用。
 *
 * 用法: npm run real-providers:smoke
 * 无 key 时 SKIP exit 0, 配置矛盾或调用失败 exit non-zero。
 */




import { maskSecret, maskWebhook, isSecretConfigured } from "../src/server/security/mask-secret";

const PASS = "✅";
const SKIP = "⏭️";
const FAIL = "❌";
let exitCode = 0;
let allSkipped = true;

function ok(msg: string) { console.log(`  ${PASS} ${msg}`); allSkipped = false; }
function skip(msg: string) { console.log(`  ${SKIP} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; allSkipped = false; }
function info(msg: string) { console.log(`    ${msg}`); }

async function testDeepSeek() {
  console.log("\n── DeepSeek 真实调用测试 ──");

  if (process.env.AI_ENABLED !== "true") { skip("AI_ENABLED !== true"); return; }
  if (process.env.AI_PROVIDER !== "deepseek") { skip(`AI_PROVIDER=${process.env.AI_PROVIDER}`); return; }
  const key = process.env.DEEPSEEK_API_KEY;
  if (!isSecretConfigured(key)) { skip("DEEPSEEK_API_KEY 未配置"); return; }

  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const model = process.env.AI_MODEL ?? "deepseek-chat";
  info(`model: ${model}, baseUrl: ${baseUrl}, key: ${maskSecret(key)}`);

  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "你是家庭财富管理助手。仅用JSON回复。" },
          { role: "user", content: "返回 {\"msg\":\"test ok\"}，不要包含投资建议。" },
        ],
        temperature: 0,
        max_tokens: 200,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const durationMs = Date.now() - startedAt;

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      fail(`HTTP ${resp.status}: ${errText.slice(0, 300)}`);
      return;
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content;
    const usage = json.usage;
    if (content) {
      ok(`调用成功 (${durationMs}ms, prompt=${usage?.prompt_tokens ?? "?"}, completion=${usage?.completion_tokens ?? "?"})`);
    } else {
      fail(`返回内容为空 (${durationMs}ms)`);
    }
  } catch (err) {
    fail(`请求失败 (${Date.now() - startedAt}ms): ${(err as Error).message}`);
  }
}

async function testWeComBot() {
  console.log("\n── WeCom Bot 真实推送测试 ──");

  if (process.env.WECHAT_PUSH_ENABLED !== "true") { skip("WECHAT_PUSH_ENABLED !== true"); return; }
  if (process.env.WECHAT_PUSH_PROVIDER !== "wecom-bot") { skip(`WECHAT_PUSH_PROVIDER=${process.env.WECHAT_PUSH_PROVIDER}`); return; }
  const webhook = process.env.WECHAT_WORK_WEBHOOK_URL;
  if (!isSecretConfigured(webhook)) { skip("WECHAT_WORK_WEBHOOK_URL 未配置"); return; }

  info(`webhook: ${maskWebhook(webhook)}`);

  const startedAt = Date.now();
  try {
    const resp = await fetch(webhook!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msgtype: "text",
        text: { content: "家庭财富罗盘测试推送：企业微信机器人配置成功。此消息不包含资产数据。" },
      }),
    });
    const json = await resp.json();
    const durationMs = Date.now() - startedAt;
    if (json.errcode === 0) ok(`推送成功 (${durationMs}ms)`);
    else fail(`推送失败: ${json.errmsg} (${durationMs}ms)`);
  } catch (err) {
    fail(`请求失败 (${Date.now() - startedAt}ms): ${(err as Error).message}`);
  }
}

async function testServerChan() {
  console.log("\n── Server 酱 真实推送测试 ──");

  if (process.env.WECHAT_PUSH_ENABLED !== "true") { skip("WECHAT_PUSH_ENABLED !== true"); return; }
  if (process.env.WECHAT_PUSH_PROVIDER !== "server-chan") { skip(`WECHAT_PUSH_PROVIDER=${process.env.WECHAT_PUSH_PROVIDER}`); return; }
  const sendKey = process.env.SERVER_CHAN_SEND_KEY;
  if (!isSecretConfigured(sendKey)) { skip("SERVER_CHAN_SEND_KEY 未配置"); return; }

  info(`sendKey: ${maskSecret(sendKey)}`);

  const startedAt = Date.now();
  try {
    const resp = await fetch(`https://sctapi.ftqq.com/${sendKey}.send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "家庭财富罗盘测试推送",
        desp: "Server 酱配置成功。此消息不包含资产数据。",
      }),
    });
    const json = await resp.json();
    const durationMs = Date.now() - startedAt;
    if (json.code === 0) ok(`推送成功 (${durationMs}ms)`);
    else fail(`推送失败: ${json.message} (${durationMs}ms)`);
  } catch (err) {
    fail(`请求失败 (${Date.now() - startedAt}ms): ${(err as Error).message}`);
  }
}

async function main() {
  console.log("\n🌐 Real Providers Smoke Test\n");

  await testDeepSeek();
  await testWeComBot();
  await testServerChan();

  if (allSkipped) {
    console.log(`\n  ${SKIP} 未配置真实 provider，mock 模式正常\n`);
  } else if (exitCode === 0) {
    console.log(`\n  ${PASS} 真实 provider 测试全部通过\n`);
  } else {
    console.log(`\n  ${FAIL} 部分真实 provider 测试失败\n`);
  }

  process.exit(exitCode);
}

main();
