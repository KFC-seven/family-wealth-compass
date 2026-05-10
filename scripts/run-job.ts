/**
 * 单次任务执行 CLI 入口。
 *
 * 使用方式:
 *   npx tsx scripts/run-job.ts <jobName> [date]
 *
 * 示例:
 *   npx tsx scripts/run-job.ts update-market-prices
 *   npx tsx scripts/run-job.ts run-daily-valuation 2026-04-29
 *
 * 注意: 必须先加载环境变量再 import 业务模块（ESM hoisting 要求）
 */
import { loadEnv } from "./utils/load-env.js";
loadEnv();

async function main() {
  const args = process.argv.slice(2);
  const jobName = args[0];
  const date = args[1];

  if (!jobName) {
    console.error("用法: npx tsx scripts/run-job.ts <jobName> [date]");
    console.error("可用任务: update-market-prices, refresh-holding-snapshots, generate-portfolio-snapshots, run-daily-valuation");
    process.exit(1);
  }

  // 动态 import 确保 env 已加载后再初始化 providers
  await import("../src/server/jobs/tasks/update-market-prices");
  await import("../src/server/jobs/tasks/refresh-holding-snapshots");
  await import("../src/server/jobs/tasks/generate-portfolio-snapshots");
  await import("../src/server/jobs/tasks/run-daily-valuation");
  await import("../src/server/jobs/tasks/generate-daily-brief");
  await import("../src/server/jobs/tasks/push-daily-brief");
  await import("../src/server/jobs/tasks/run-morning-brief");

  const { runJob } = await import("../src/server/jobs/runner");

  console.log(`[run-job] 启动: ${jobName}${date ? ` 日期=${date}` : ""}`);
  const result = await runJob(jobName, "MANUAL", date);

  if (result.status === "FAILED") {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[run-job] 未捕获异常:", err);
  process.exit(1);
});
