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
 * 注意: 需要先加载环境变量（tsx + dotenv 已在 .env 中处理）。
 */
import "dotenv/config";

// 注册所有任务（side-effect import）
import "../src/server/jobs/tasks/update-market-prices";
import "../src/server/jobs/tasks/refresh-holding-snapshots";
import "../src/server/jobs/tasks/generate-portfolio-snapshots";
import "../src/server/jobs/tasks/run-daily-valuation";
import "../src/server/jobs/tasks/generate-daily-brief";
import "../src/server/jobs/tasks/push-daily-brief";
import "../src/server/jobs/tasks/run-morning-brief";

import { runJob } from "../src/server/jobs/runner";

async function main() {
  const args = process.argv.slice(2);
  const jobName = args[0];
  const date = args[1];

  if (!jobName) {
    console.error("用法: npx tsx scripts/run-job.ts <jobName> [date]");
    console.error("可用任务: update-market-prices, refresh-holding-snapshots, generate-portfolio-snapshots, run-daily-valuation");
    process.exit(1);
  }

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
