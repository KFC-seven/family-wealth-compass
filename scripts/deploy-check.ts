import { loadEnv } from "./utils/load-env.js";
loadEnv();
/**
 * 部署前检查脚本 — 验证生产环境配置完整性
 * 用法: npm run deploy:check
 */




import fs from "node:fs/promises";

const PASS = "✅";
const WARN = "⚠️";
const FAIL = "❌";
let exitCode = 0;
const isProd = process.env.NODE_ENV === "production";

function ok(msg: string) { console.log(`  ${PASS} ${msg}`); }
function warn(msg: string) { console.log(`  ${WARN} ${msg}`); if (isProd) exitCode = 1; }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; }

async function main() {
  console.log("\n🔍 部署检查\n");

  // 1. NODE_ENV
  const mode = process.env.NODE_ENV ?? "development";
  console.log(`  环境: ${mode} ${isProd ? "(生产)" : "(开发)"}`);

  // 2. DATABASE_URL
  if (!process.env.DATABASE_URL) fail("DATABASE_URL 未设置");
  else {
    const u = process.env.DATABASE_URL;
    if (u.includes("CHANGE_ME")) fail("DATABASE_URL 包含 CHANGE_ME，请修改");
    else ok("DATABASE_URL 已设置");
  }

  // 3. API mode
  if (process.env.NEXT_PUBLIC_USE_API !== "true") {
    if (isProd) fail("生产环境 NEXT_PUBLIC_USE_API 必须为 true");
    else warn("NEXT_PUBLIC_USE_API !== true (开发可接受)");
  } else ok("NEXT_PUBLIC_USE_API=true");

  // 4. AUTH
  if (process.env.AUTH_ENABLED !== "true") {
    if (isProd) fail("生产环境 AUTH_ENABLED 必须为 true");
    else warn("AUTH_ENABLED 未开启");
  } else ok("AUTH_ENABLED=true");

  if (isProd && process.env.AUTH_DEV_ALLOW_SEED_LOGIN === "true") {
    warn("生产环境 AUTH_DEV_ALLOW_SEED_LOGIN 应为 false");
  }

  if (isProd && process.env.AUTH_REQUIRE_HTTPS !== "true") {
    warn("生产环境建议 AUTH_REQUIRE_HTTPS=true");
  }

  if (process.env.AUTH_ENABLED === "true" && process.env.AUTH_SESSION_MAX_AGE_DAYS) {
    ok(`Session 有效期: ${process.env.AUTH_SESSION_MAX_AGE_DAYS} 天`);
  }

  // 4. 密码检查
  if (process.env.SEED_ADMIN_PASSWORD?.includes("ChangeMe123!")) {
    if (isProd) fail("SEED_ADMIN_PASSWORD 仍为默认值 ChangeMe123!，请修改");
    else warn("SEED_ADMIN_PASSWORD 为默认值 (生产请修改)");
  } else if (process.env.AUTH_ENABLED === "true" && !process.env.SEED_ADMIN_PASSWORD) {
    warn("SEED_ADMIN_PASSWORD 未设置");
  } else ok("SEED_ADMIN_PASSWORD 非默认");

  // 5. Secrets
  const secrets = [
    ["JOB_API_SECRET", process.env.JOB_API_SECRET],
    ["BRIEF_API_SECRET", process.env.BRIEF_API_SECRET],
    ["PUSH_API_SECRET", process.env.PUSH_API_SECRET],
    ["UPLOAD_API_SECRET", process.env.UPLOAD_API_SECRET],
  ];
  for (const [name, val] of secrets) {
    if (isProd && (!val || val === "CHANGE_ME" || val.length < 8)) {
      fail(`${name} 未设置或太短`);
    } else if (!isProd && (!val || val.length < 1)) {
      warn(`${name} 未设置 (开发可接受)`);
    } else ok(`${name} 已配置`);
  }

  // 6. Upload dir
  const uploadDir = process.env.LOCAL_UPLOAD_DIR ?? "./uploads";
  try {
    await fs.access(uploadDir);
    ok(`上传目录存在: ${uploadDir}`);
  } catch {
    if (process.env.UPLOAD_ENABLED === "true") {
      try { await fs.mkdir(uploadDir, { recursive: true }); ok(`上传目录已创建: ${uploadDir}`); }
      catch { warn(`上传目录不可创建: ${uploadDir}`); }
    } else ok(`上传未启用，跳过目录检查`);
  }

  // 7. .gitignore
  const gitignore = await fs.readFile(".gitignore", "utf-8").catch(() => "");
  for (const entry of ["uploads", "logs", "backups", ".env.production"]) {
    if (gitignore.includes(entry)) ok(`${entry} 在 .gitignore`);
    else warn(`${entry} 不在 .gitignore`);
  }

  // 8. next.config
  const nextConfig = await fs.readFile("next.config.ts", "utf-8").catch(() => "");
  if (nextConfig.includes('output: "standalone"')) ok("Next.js standalone 输出模式");
  else warn("未检测到 standalone 输出模式");

  // 9. 数据库连接
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("CHANGE_ME")) {
    try {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { PrismaClient } = await import("../src/generated/prisma/client");
      const a = new PrismaPg({ connectionString: process.env.DATABASE_URL });
      const p = new PrismaClient({ adapter: a });
      const start = Date.now();
      await p.$queryRawUnsafe("SELECT 1");
      const ms = Date.now() - start;
      await p.$disconnect();
      ok(`数据库连接成功 (${ms}ms)`);
    } catch { warn("数据库不可达 (部署后检查)"); }
  }

  // 10. Summary
  if (exitCode === 0 && !isProd) {
    console.log(`\n${PASS} 开发环境检查通过 (部分 waring 可接受)\n`);
  } else if (exitCode === 0) {
    console.log(`\n${PASS} 生产环境检查通过\n`);
  } else {
    console.log(`\n${FAIL} 发现问题，请修复后重新部署\n`);
  }

  process.exit(exitCode);
}

main();
