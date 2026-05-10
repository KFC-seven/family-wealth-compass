import dotenv from "dotenv";
import path from "node:path";

/** 统一加载环境变量: .env → .env.local (覆盖) → .env.production (如存在) */
export function loadEnv() {
  dotenv.config();
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
  // Always load .env.production if present (not just when NODE_ENV=production)
  // The env file itself sets NODE_ENV=production for deployments
  const prodEnvPath = path.resolve(process.cwd(), ".env.production");
  try {
    const fs = require("node:fs");
    if (fs.existsSync(prodEnvPath)) {
      dotenv.config({ path: prodEnvPath, override: true });
    }
  } catch {
    // In ESM context, fall back to conditional check
    dotenv.config({ path: prodEnvPath, override: true });
  }
}
