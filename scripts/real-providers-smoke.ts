/**
 * 真实 Provider smoke test — 仅在环境变量完整配置时执行。
 *
 * 用法: npm run real-providers:smoke
 * 没有真实 key 时全部 SKIP，exit 0。
 */
import "dotenv/config";

const PASS = "✅";
const SKIP = "⏭️";
const FAIL = "❌";
let exitCode = 0;

function ok(msg: string) { console.log(`  ${PASS} ${msg}`); }
function skip(msg: string) { console.log(`  ${SKIP} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; }

function checkSecret(name: string, val: string | undefined): boolean {
  return !!val && val.length > 0 && val !== "CHANGE_ME";
}

async function testDeepSeek() {
  console.log("\n── DeepSeek 真实调用测试 ──");

  if (process.env.AI_ENABLED !== "true") {
    skip("AI_ENABLED !== true"); return;
  }
  if (process.env.AI_PROVIDER !== "deepseek") {
    skip(`AI_PROVIDER=${process.env.AI_PROVIDER}, 非 deepseek`); return;
  }
  const key = process.env.DEEPSEEK_API_KEY;
  if (!checkSecret("DEEPSEEK_API_KEY", key)) {
    skip("DEEPSEEK_API_KEY 未配置"); return;
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const model = process.env.AI_MODEL ?? "deepseek-chat";

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
          { role: "user", content: "回复 {\"status\":\"ok\"}" },
        ],
        temperature: 0,
        max_tokens: 100,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      fail(`DeepSeek API ${resp.status}: ${errText.slice(0, 200)}`);
      return;
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content;
    if (content) ok(`DeepSeek 真实调用成功 (model=${model})`);
    else fail("DeepSeek 返回内容为空");
  } catch (err) {
    fail(`DeepSeek 请求失败: ${(err as Error).message}`);
  }
}

async function testWeComBot() {
  console.log("\n── WeCom Bot 真实推送测试 ──");

  if (process.env.WECHAT_PUSH_ENABLED !== "true") {
    skip("WECHAT_PUSH_ENABLED !== true"); return;
  }
  if (process.env.WECHAT_PUSH_PROVIDER !== "wecom-bot") {
    skip(`WECHAT_PUSH_PROVIDER=${process.env.WECHAT_PUSH_PROVIDER}`); return;
  }
  const webhook = process.env.WECHAT_WORK_WEBHOOK_URL;
  if (!checkSecret("WECHAT_WORK_WEBHOOK_URL", webhook)) {
    skip("WECHAT_WORK_WEBHOOK_URL 未配置"); return;
  }

  try {
    const resp = await fetch(webhook!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msgtype: "text",
        text: { content: "家庭财富罗盘测试推送：如果你看到这条消息，说明企业微信机器人配置成功。" },
      }),
    });
    const json = await resp.json();
    if (json.errcode === 0) ok("WeCom Bot 真实推送成功");
    else fail(`WeCom Bot 推送失败: ${json.errmsg}`);
  } catch (err) {
    fail(`WeCom Bot 请求失败: ${(err as Error).message}`);
  }
}

async function testServerChan() {
  console.log("\n── Server 酱 真实推送测试 ──");

  if (process.env.WECHAT_PUSH_ENABLED !== "true") {
    skip("WECHAT_PUSH_ENABLED !== true"); return;
  }
  if (process.env.WECHAT_PUSH_PROVIDER !== "server-chan") {
    skip(`WECHAT_PUSH_PROVIDER=${process.env.WECHAT_PUSH_PROVIDER}`); return;
  }
  const sendKey = process.env.SERVER_CHAN_SEND_KEY;
  if (!checkSecret("SERVER_CHAN_SEND_KEY", sendKey)) {
    skip("SERVER_CHAN_SEND_KEY 未配置"); return;
  }

  try {
    const resp = await fetch(`https://sctapi.ftqq.com/${sendKey}.send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "家庭财富罗盘测试推送",
        desp: "如果你看到这条消息，说明 Server 酱配置成功。",
      }),
    });
    const json = await resp.json();
    if (json.code === 0) ok("Server 酱 真实推送成功");
    else fail(`Server 酱推送失败: ${json.message}`);
  } catch (err) {
    fail(`Server 酱请求失败: ${(err as Error).message}`);
  }
}

async function main() {
  console.log("\n🌐 Real Providers Smoke Test\n");

  await testDeepSeek();
  await testWeComBot();
  await testServerChan();

  if (exitCode === 0) {
    console.log(`\n${PASS} Real providers smoke 完成 (未配置项已 SKIP)\n`);
    console.log("  配置真实 provider 后重新运行可执行真实调用。\n");
  } else {
    console.log(`\n${FAIL} 部分真实 provider 测试失败\n`);
  }

  process.exit(exitCode);
}

main();
