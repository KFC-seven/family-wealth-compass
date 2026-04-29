# 定时任务系统 (Scheduled Jobs)

## 一、设计概述

轻量级定时任务框架，适合阿里云 ECS 单机部署。不依赖 Vercel Cron、Kafka、Redis、BullMQ 等外部服务。

### 核心原则

- 任务可通过 CLI 命令单次执行
- 可选常驻调度器用于开发环境
- 生产环境推荐 Linux crontab / systemd timer / PM2 cron
- 每次执行完整记录 JobRun（耗时、成功/失败/跳过数、错误信息）
- 单个资产失败不影响整个任务

## 二、目录结构

```
src/server/jobs/
  types.ts           # JobDefinition, JobContext, JobResult 等类型
  registry.ts        # 任务注册表
  runner.ts          # 任务执行引擎（单任务 + 串行序列）
  logger.ts          # JobRun 数据库记录
  tasks/
    update-market-prices.ts          # 更新行情/净值
    refresh-holding-snapshots.ts     # 刷新持仓快照
    generate-portfolio-snapshots.ts  # 生成组合快照
    run-daily-valuation.ts           # 每日估值（串行上述三步）

scripts/
  run-job.ts         # CLI 单次执行入口
  scheduler.ts       # 可选常驻调度器
```

## 三、任务清单

| 任务名 | 显示名 | 说明 |
|--------|--------|------|
| `update-market-prices` | 更新行情/净值 | 查询活跃 Asset，通过数据源拉取行情/净值，写入 PriceSnapshot，更新 Holding.currentPrice |
| `refresh-holding-snapshots` | 刷新持仓快照 | 用最新价格重算所有 CURRENT 持仓的 currentMarketValue、holdingReturn、cumulativeReturn |
| `generate-portfolio-snapshots` | 生成组合快照 | 为 HOUSEHOLD/MEMBER/HOLDING 三个级别生成当日 PortfolioSnapshot |
| `run-daily-valuation` | 每日估值 | 串行执行上述三个任务 |

## 四、运行方式

### 1. CLI 单次执行

```bash
npm run job:update-prices           # 更新行情/净值
npm run job:refresh-holdings        # 刷新持仓快照
npm run job:portfolio-snapshot      # 生成组合快照
npm run job:daily-valuation         # 每日估值（串行执行全部三部）
```

支持日期参数：

```bash
npx tsx scripts/run-job.ts generate-portfolio-snapshots 2026-04-29
```

### 2. 常驻调度器（开发用）

```bash
npm run scheduler:start
```

需要在 .env 中设置 `SCHEDULER_ENABLED=true`。调度器每分钟检查一次 ScheduledJob 表中到期的任务。

**注意：** 常驻调度器适用于开发和 ECS 单机部署的简单场景。生产环境更推荐 crontab / systemd timer 触发单次脚本。

### 3. 生产环境 crontab 示例

```bash
# 每天 21:30 执行每日估值（上海时区）
30 21 * * 1-5 cd /path/to/app && /usr/bin/npm run job:daily-valuation >> logs/daily-valuation.log 2>&1

# 单独触发某个任务
0 12 * * * cd /path/to/app && /usr/bin/npm run job:update-prices >> logs/update-prices.log 2>&1
```

### 4. PM2 方式

```bash
pm2 start "npm run job:daily-valuation" --name "daily-valuation" --cron "30 21 * * 1-5"
```

### 5. systemd timer

```
# /etc/systemd/system/daily-valuation.service
[Service]
Type=oneshot
User=app
WorkingDirectory=/path/to/app
ExecStart=/usr/bin/npm run job:daily-valuation

# /etc/systemd/system/daily-valuation.timer
[Timer]
OnCalendar=Mon..Fri 21:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

## 五、CLI 和常驻调度器对比

| 对比维度 | CLI 单次执行 | 常驻调度器 |
|---------|------------|----------|
| 依赖 | 仅 tsx | node-cron（可选） |
| 资源占用 | 执行完释放 | 持续占用内存 |
| 可靠性 | 依赖外部 cron | 进程崩溃会中断 |
| 推荐场景 | 生产环境 | 开发/测试 |
| 部署 | crontab/systemd | PM2/systemd 守护 |

## 六、手动触发 API

### POST /api/jobs/run

```json
{
  "jobName": "run-daily-valuation",
  "date": "2026-04-29"
}
```

安全要求：
- 如果设置了 `JOB_API_SECRET`，需要在 Header `x-job-api-secret` 中传入。
- 生产环境必须设置 `JOB_API_SECRET`。

### GET /api/jobs

返回所有 ScheduledJob 配置及其最近状态。

### GET /api/jobs/runs

返回最近 JobRun 列表，支持 `?limit=` 参数。

## 七、JobRun 状态说明

| 状态 | 含义 |
|------|------|
| RUNNING | 执行中 |
| SUCCESS | 全部成功 |
| FAILED | 全部失败 |
| PARTIAL | 部分成功（一些资产/持仓处理失败） |
| SKIPPED | 已跳过（无数据需要处理） |

## 八、数据库模型

### ScheduledJob

任务配置表，定义任务的名称、Cron 表达式、启用状态及最后运行状态。

### JobRun

任务执行记录表，每次任务触发写入一条，包含耗时、成功/失败/跳过数量、错误信息。

## 九、故障排查

### 任务未执行
- 检查 `SCHEDULER_ENABLED=true` 是否设置
- 检查 ScheduledJob 的 `isEnabled` 是否为 true
- 检查 `nextRunAt` 时间是否正确

### JobRun 表为空
- 确认 seed 数据正常写入
- 确认数据库连接正常

### 所有资产更新失败
- 查看 JobRun 的 errorMessage 字段
- 确认数据源配置是否正确（GET /api/market-data/sources）
- 尝试切换到 mock 模式：`MARKET_DATA_MODE=mock`
