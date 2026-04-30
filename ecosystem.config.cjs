/**
 * PM2 生产配置 — 家庭财富罗盘
 *
 * 用法:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 *
 * 生产 .env.production 中的变量由脚本加载（见 scripts/utils/load-env.ts）。
 * CLI 任务 (crontab) 会自动加载 .env.production。
 */
module.exports = {
  apps: [{
    name: "family-wealth-compass",
    script: ".next/standalone/server.js",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",
    max_memory_restart: "512M",
    env_production: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    error_file: "logs/pm2-error.log",
    out_file: "logs/pm2-output.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: "10s",
    listen_timeout: 15000,
    kill_timeout: 8000,
  }],
};
