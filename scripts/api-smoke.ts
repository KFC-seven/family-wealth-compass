/**
 * API smoke test — 检查所有端点返回 ok:true。
 *
 * 用法: npm run api:smoke
 *        npx tsx scripts/api-smoke.ts
 *
 * 需要 dev server 在运行 (默认 http://localhost:3000)。
 */

const BASE = process.env.API_BASE || "http://localhost:3000";

interface CheckResult {
  endpoint: string;
  ok: boolean;
  status?: number;
  error?: string;
}

async function check(endpoint: string): Promise<CheckResult> {
  try {
    const res = await fetch(`${BASE}/api${endpoint}`);
    const status = res.status;
    const json = await res.json();
    return {
      endpoint: `GET /api${endpoint}`,
      ok: json.ok === true,
      status,
      error: json.ok ? undefined : json.error?.message || "unknown",
    };
  } catch (e: unknown) {
    return {
      endpoint: `GET /api${endpoint}`,
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

async function main() {
  console.log(`\n  🔍 API Smoke Test — ${BASE}\n`);
  console.log("  注意: 需要 dev server 在运行 (npm run dev)\n");

  const endpoints = [
    "/health",
    "/portfolio/household-summary",
    "/members",
    "/holdings",
    "/transactions",
    "/daily-brief",
    "/settings",
    // Phase 8
    "/jobs",
    "/jobs/runs",
    "/market-data/sources",
  ];

  const results = await Promise.all(endpoints.map(check));
  let passed = 0;
  let failed = 0;

  for (const r of results) {
    if (r.ok) {
      console.log(`  ✅ ${r.endpoint} (${r.status})`);
      passed++;
    } else {
      console.log(`  ❌ ${r.endpoint} — ${r.error} (status: ${r.status ?? "N/A"})`);
      failed++;
    }
  }

  console.log(`\n  ─────────────────────────────────`);
  console.log(`  Result: ${passed} passed, ${failed} failed, ${results.length} total`);
  if (failed > 0) {
    console.log(`\n  建议:`);
    console.log(`    1. 确保 PostgreSQL 运行: npm run db:up`);
    console.log(`    2. 确保 seed 已执行:     npm run db:seed`);
    console.log(`    3. 运行诊断:             npm run db:doctor`);
    console.log(`    4. 查看容器日志:         npm run db:logs\n`);
  }
  console.log("");

  process.exit(failed > 0 ? 1 : 0);
}

main();
