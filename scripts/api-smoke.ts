/**
 * API smoke test — checks key endpoints return 200 with ok:true.
 *
 * Usage: npx tsx scripts/api-smoke.ts
 *
 * Requires the dev server running on http://localhost:3000.
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
  console.log(`\n  API Smoke Test — ${BASE}\n`);

  const endpoints = [
    "/health",
    "/portfolio/household-summary",
    "/members",
    "/holdings",
    "/transactions",
    "/daily-brief",
    "/settings",
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

  console.log(`\n  Result: ${passed} passed, ${failed} failed, ${results.length} total\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
