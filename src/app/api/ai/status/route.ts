import { createSuccessResponse, handleApiError } from "@/server/api/response";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  try {
    const provider = process.env.AI_PROVIDER ?? "mock";
    const enabled = process.env.AI_ENABLED === "true" || provider === "mock";
    const configured = provider === "mock" || !!process.env.DEEPSEEK_API_KEY || !!process.env.ALIYUN_BAILIAN_API_KEY;

    const lastRun = await prisma.aiGenerationRun.findFirst({
      orderBy: { createdAt: "desc" },
    });

    return createSuccessResponse({
      provider,
      enabled,
      configured,
      model: process.env.AI_MODEL ?? "mock",
      lastRun: lastRun ? {
        status: lastRun.status,
        startedAt: lastRun.startedAt.toISOString(),
        durationMs: lastRun.durationMs,
        errorMessage: lastRun.errorMessage,
      } : null,
      lastStatus: lastRun?.status ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
