import { createSuccessResponse, createErrorResponse } from "@/server/api/response";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  // 数据库连通性检查
  let dbConnected = false;
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  try {
    const start = Date.now();
    await prisma.$queryRawUnsafe<Array<{ "1": number }>>("SELECT 1");
    dbLatencyMs = Date.now() - start;
    dbConnected = true;
  } catch (err) {
    dbError = (err as Error).message;
  }

  const env = {
    useApiData: process.env.NEXT_PUBLIC_USE_API === "true",
    marketDataMode: process.env.MARKET_DATA_MODE ?? "mock",
    schedulerEnabled: process.env.SCHEDULER_ENABLED === "true",
  };

  if (!dbConnected) {
    return createErrorResponse(
      {
        code: "DATABASE_UNAVAILABLE",
        message: "数据库连接失败，请检查 PostgreSQL 是否运行",
        details: {
          hint: "运行 npm run db:up 启动 PostgreSQL, 或 npm run db:doctor 诊断",
          database: { connected: false, error: dbError },
          environment: env,
        },
      },
      503,
    );
  }

  return createSuccessResponse({
    status: "ok",
    database: {
      connected: true,
      latencyMs: dbLatencyMs,
    },
    environment: env,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
