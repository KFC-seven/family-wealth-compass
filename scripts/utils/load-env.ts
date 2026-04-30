import dotenv from "dotenv";
import path from "node:path";

/** 统一加载环境变量: .env → .env.local (覆盖) → .env.production (如 NODE_ENV=production) */
export function loadEnv() {
  dotenv.config();
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
  if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: path.resolve(process.cwd(), ".env.production"), override: true });
  }
}
