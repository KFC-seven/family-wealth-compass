/**
 * 可选常驻调度器。
 *
 * 使用方式:
 *   npx tsx scripts/scheduler.ts
 *   npm run scheduler:start
 *
 * 用于开发或 ECS 单机部署。
 * 生产环境更推荐 Linux crontab / systemd timer / PM2 cron 触发单次脚本。
 *
 * 通过环境变量控制:
 *   SCHEDULER_ENABLED=true  启用调度器
 *   SCHEDULER_TIMEZONE=Asia/Shanghai
 *
 * 调度规则从数据库 ScheduledJob 表读取。
 * 每分钟检查一次是否有需要执行的任务。
 */
import "dotenv/config";

// 注册所有任务
import "../src/server/jobs/tasks/update-market-prices";
import "../src/server/jobs/tasks/refresh-holding-snapshots";
import "../src/server/jobs/tasks/generate-portfolio-snapshots";
import "../src/server/jobs/tasks/run-daily-valuation";

import { prisma } from "../src/server/db/prisma";
import { runJob } from "../src/server/jobs/runner";

const CHECK_INTERVAL_MS = 60_000; // 每分钟检查

async function tick() {
  const now = new Date();
  console.log(`[Scheduler] 检查 ${now.toISOString()} ...`);

  try {
    const jobs = await prisma.scheduledJob.findMany({
      where: { isEnabled: true },
    });

    let fired = 0;
    for (const job of jobs) {
      if (!job.nextRunAt) continue;

      const next = new Date(job.nextRunAt);
      if (next <= now) {
        console.log(`[Scheduler] 触发: ${job.name}`);
        runJob(job.name, "SCHEDULER").catch((err) => {
          console.error(`[Scheduler] ${job.name} 失败:`, (err as Error).message);
        });
        fired++;
      }
    }

    if (fired === 0) {
      console.log("[Scheduler] 无到期任务");
    }
  } catch (err) {
    console.error("[Scheduler] tick 异常:", (err as Error).message);
  }
}

async function main() {
  const enabled = process.env.SCHEDULER_ENABLED === "true";
  if (!enabled) {
    console.log("[Scheduler] SCHEDULER_ENABLED !== true, 退出");
    return;
  }

  console.log("[Scheduler] 调度器已启动, 检查间隔 60s");
  console.log(`[Scheduler] 时区: ${process.env.SCHEDULER_TIMEZONE ?? "Asia/Shanghai"}`);

  tick(); // 立即执行一次
  setInterval(tick, CHECK_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[Scheduler] 致命错误:", err);
  process.exit(1);
});
