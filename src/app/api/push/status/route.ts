import { createSuccessResponse, handleApiError } from "@/server/api/response";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  try {
    const provider = process.env.WECHAT_PUSH_PROVIDER ?? "mock";
    const enabled = process.env.WECHAT_PUSH_ENABLED === "true" || provider === "mock";
    const configured = provider === "mock" || !!process.env.WECHAT_WORK_WEBHOOK_URL || !!process.env.SERVER_CHAN_SEND_KEY;

    const lastPush = await prisma.pushNotification.findFirst({
      orderBy: { createdAt: "desc" },
    });

    return createSuccessResponse({
      provider,
      enabled,
      configured,
      lastPush: lastPush ? {
        status: lastPush.status,
        channel: lastPush.channel,
        title: lastPush.title,
        sentAt: lastPush.sentAt?.toISOString() ?? null,
        errorMessage: lastPush.errorMessage,
      } : null,
      lastStatus: lastPush?.status ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
