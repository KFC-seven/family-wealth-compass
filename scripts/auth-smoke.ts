/**
 * Auth smoke test — 验证认证全链路 (service-level, 不需要 dev server)。
 *
 * 用法: npm run auth:smoke
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword, verifyPassword } from "../src/server/auth/password";
import { createSession, getSessionFromToken, revokeSession } from "../src/server/auth/session";
import { getPermissionsForRole } from "../src/server/auth/permissions";

const PASS = "✅";
const FAIL = "❌";
let exitCode = 0;
function ok(msg: string) { console.log(`  ${PASS} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; }

async function main() {
  console.log("\n🔐 Auth Smoke Test — service-level\n");

  if (!process.env.DATABASE_URL) { fail("DATABASE_URL 未设置"); process.exit(1); }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();
  ok("数据库连接成功");

  // Step 1: Verify seed admin exists
  console.log("\n--- Step 1: 验证 seed 管理员 ---");
  const admin = await prisma.user.findFirst({
    include: { passwordCredential: true },
  });
  if (admin && admin.passwordCredential) {
    ok(`管理员存在: ${admin.email}, 有 PasswordCredential`);
  } else {
    fail("管理员或密码凭证缺失，请先 npm run db:seed");
    process.exit(1);
  }

  // Step 2: Verify password hash is not plaintext
  console.log("\n--- Step 2: 密码哈希检查 ---");
  const cred = admin.passwordCredential!;
  if (cred.passwordHash.length > 40 && cred.passwordSalt.length > 20) {
    ok(`密码哈希安全: salt=${cred.passwordSalt.slice(0, 8)}..., hash=${cred.passwordHash.slice(0, 8)}...`);
  } else {
    fail("密码哈希异常");
  }

  // Step 3: Test hashPassword + verifyPassword
  console.log("\n--- Step 3: 密码哈希/验证 ---");
  const { hash, salt } = hashPassword("TestPwd123!");
  if (verifyPassword("TestPwd123!", salt, hash)) {
    ok("密码哈希和验证正常");
  } else {
    fail("密码验证失败");
  }
  if (!verifyPassword("WrongPassword", salt, hash)) {
    ok("错误密码正确拒绝");
  } else {
    fail("错误密码未拒绝");
  }

  // Step 4: Verify admin password
  console.log("\n--- Step 4: 验证管理员密码 ---");
  const adminPwd = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  if (verifyPassword(adminPwd, cred.passwordSalt, cred.passwordHash)) {
    ok("管理员密码验证通过");
  } else {
    fail("管理员密码验证失败");
  }

  // Step 5: Session
  console.log("\n--- Step 5: Session 创建/验证/吊销 ---");
  const { token, sessionId } = await createSession(admin.id);
  ok(`Session 创建: ${sessionId.slice(0, 12)}...`);

  const session = await getSessionFromToken(token);
  if (session && session.userId === admin.id) {
    ok("Session 验证通过");
  } else {
    fail("Session 验证失败");
  }

  await revokeSession(sessionId);
  const revoked = await getSessionFromToken(token);
  if (!revoked) {
    ok("Session 吊销成功");
  } else {
    fail("Session 吊销失败");
  }

  // Step 6: Permissions
  console.log("\n--- Step 6: 权限模型 ---");
  const adminPerms = getPermissionsForRole(true);
  const memberPerms = getPermissionsForRole(false);
  if (adminPerms.canManageSettings && adminPerms.canRunJobs) ok("管理员权限完整");
  else fail("管理员权限不足");
  if (!memberPerms.canManageSettings) ok("普通成员权限受限");
  else fail("普通成员权限不应有管理权限");

  await prisma.$disconnect();
  if (exitCode === 0) console.log(`\n${PASS} Auth smoke test 全部通过\n`);
  else console.log(`\n${FAIL} Auth smoke test 存在问题\n`);
  process.exit(exitCode);
}

main();
