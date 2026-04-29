import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, handleApiError } from "@/server/api/response";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20") || 20, 100);

    const runs = await prisma.jobRun.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    const data = runs.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      jobName: r.jobName,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
      durationMs: r.durationMs,
      triggeredBy: r.triggeredBy,
      successCount: r.successCount,
      failureCount: r.failureCount,
      skippedCount: r.skippedCount,
      errorMessage: r.errorMessage,
      errorDetails: r.errorDetails,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    }));

    return createSuccessResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
