/**
 * 生产环境 smoke test
 *
 * 用法: npm run prod:smoke [baseUrl]
 * 默认检查本地 localhost:3000
 *
 * 检查: NODE_ENV, API, Auth, Provider, Secret 不泄露
 */
import { loadEnv } from "./utils/load-env.js";
loadEnv();

const BASE = process.argv[2] || "http://localhost:3000";
const PASS = "✅";
const FAIL = "❌";
const WARN = "⚠️";
let exitCode = 0;

function ok(msg: string) { console.log(`  ${PASS} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; }
function warn(msg: string) { console.log(`  ${WARN} ${msg}`); }

async function get(path: string) {
  const r = await fetch(`${BASE}${path}`);
  const json = await r.json();
  return { status: r.status, json };
}

async function post(path: string, body?: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json();
  return { status: r.status, json };
}

function checkNoSecret(obj: unknown, path = ""): string[] {
  const issues: string[] = [];
  if (typeof obj === "string") {
    if (obj.match(/sk-[a-zA-Z0-9]{20,}/)) issues.push(`${path}: 疑似包含 API key`);
    if (obj.match(/SCT\d{10,}/)) issues.push(`${path}: 疑似包含 SendKey`);
    if (obj.match(/key=[a-zA-Z0-9]{10,}/)) issues.push(`${path}: 疑似包含 webhook key`);
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => issues.push(...checkNoSecret(v, `${path}[${i}]`)));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      issues.push(...checkNoSecret(v, `${path}.${k}`));
    }
  }
  return issues;
}

async function main() {
  console.log(`\n🏭 Production Smoke Test — ${BASE}\n`);

  // 1. Environment check
  console.log("── Step 1: 环境检查 ──");
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv === "production") ok("NODE_ENV=production");
  else warn(`NODE_ENV=${nodeEnv} (生产应为 production)`);

  if (process.env.NEXT_PUBLIC_USE_API === "true") ok("NEXT_PUBLIC_USE_API=true");
  else warn("NEXT_PUBLIC_USE_API !== true (生产建议开启)");

  if (process.env.AUTH_ENABLED === "true") ok("AUTH_ENABLED=true");
  else warn("AUTH_ENABLED !== true (生产建议开启)");

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("CHANGE_ME")) ok("DATABASE_URL 已配置");
  else fail("DATABASE_URL 缺失或为默认值");

  // 2. Health check
  console.log("\n── Step 2: API 健康检查 ──");
  try {
    const health = await get("/api/health");
    if (health.json.ok) ok(`/api/health: ok (${health.json.data?.database?.connected ? "DB connected" : "DB disconnected"})`);
    else fail(`/api/health: ${health.json.error?.message}`);
    checkNoSecret(health.json).forEach(fail);
  } catch (e) { fail(`/api/health: ${(e as Error).message}`); }

  // 3. Auth check
  console.log("\n── Step 3: 认证检查 ──");
  try {
    const me = await get("/api/auth/me");
    if (me.status === 401 || (me.json.ok === false)) ok("/api/auth/me: 未登录时正确拒绝");
    else if (me.json.ok) ok("/api/auth/me: 已登录");
    else fail(`/api/auth/me: 异常响应`);
    checkNoSecret(me.json).forEach(fail);
  } catch (e) { fail(`/api/auth/me: ${(e as Error).message}`); }

  // 4. Login test (if seed admin configured)
  console.log("\n── Step 4: 登录测试 ──");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.local";
  const adminPwd = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  if (adminPwd.includes("ChangeMe123!")) {
    warn("SEED_ADMIN_PASSWORD 为默认值，跳过登录测试");
  } else {
    try {
      const login = await post("/api/auth/login", { email: adminEmail, password: adminPwd });
      if (login.json.ok) ok(`登录成功: ${adminEmail}`);
      else fail(`登录失败: ${login.json.error?.message}`);
    } catch (e) { fail(`登录请求失败: ${(e as Error).message}`); }
  }

  // 5. Data APIs
  console.log("\n── Step 5: 数据 API ──");
  try {
    const hh = await get("/api/portfolio/household-summary");
    if (hh.json.ok) ok(`/api/portfolio/household-summary: ok`);
    else warn("可能需要登录才能访问数据 API");
  } catch { warn("/api/portfolio/household-summary 不可达"); }

  try {
    const brief = await get("/api/daily-brief");
    if (brief.json.ok) ok(`/api/daily-brief: ok`);
  } catch { warn("/api/daily-brief 不可达"); }

  // 6. Status APIs (no secret leak)
  console.log("\n── Step 6: Status API (确保不泄露 secret) ──");
  for (const path of ["/api/ai/status", "/api/push/status"]) {
    try {
      const resp = await get(path);
      const issues = checkNoSecret(resp.json);
      if (issues.length === 0) ok(`${path}: 无 secret 泄露`);
      else issues.forEach(fail);
    } catch { warn(`${path} 不可达`); }
  }

  // 7. deploy:check
  console.log("\n── Step 7: deploy:check ──");
  try {
    const { execSync } = await import("node:child_process");
    execSync("npx tsx scripts/deploy-check.ts", { stdio: "pipe", timeout: 15000 });
    ok("deploy:check 通过");
  } catch { warn("deploy:check 未通过 (开发环境可接受)"); }

  // 8. providers:doctor
  console.log("\n── Step 8: providers:doctor ──");
  try {
    const { execSync } = await import("node:child_process");
    execSync("npx tsx scripts/providers-doctor.ts", { stdio: "pipe", timeout: 15000 });
    ok("providers:doctor 通过");
  } catch { warn("providers:doctor 未通过"); }

  if (exitCode === 0) console.log(`\n${PASS} Production smoke 通过\n`);
  else console.log(`\n${FAIL} 发现问题\n`);

  process.exit(exitCode);
}

main();
