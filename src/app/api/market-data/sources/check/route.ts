import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, handleApiError } from "@/server/api/response";
import { healthCheckAll } from "@/server/market-data/registry";

/**
 * 手动触发所有数据源的健康检查，并更新数据库中的状态。
 */
export async function POST() {
  try {
    const results = await healthCheckAll();

    // 更新数据库中的数据源状态
    for (const [name, health] of Object.entries(results)) {
      const statusMap: Record<string, string> = {
        HEALTHY: "HEALTHY",
        DEGRADED: "DEGRADED",
        FAILED: "FAILED",
        DISABLED: "DISABLED",
      };
      await prisma.marketDataSource.updateMany({
        where: { name },
        data: {
          lastCheckedAt: new Date(),
          lastStatus: statusMap[health.status] as any ?? "FAILED",
        },
      });
    }

    return createSuccessResponse(results);
  } catch (err) {
    return handleApiError(err);
  }
}
