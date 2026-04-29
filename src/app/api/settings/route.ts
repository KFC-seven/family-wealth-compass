import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { validateBody } from "@/server/api/validators";
import { settingsUpdateSchema } from "@/server/api/validators";

export async function GET() {
  try {
    const settings = await prisma.appSettings.findFirst();
    if (!settings) {
      return createErrorResponse({ code: "NOT_FOUND", message: "暂无设置" }, 404);
    }
    return createSuccessResponse({
      id: settings.id,
      appearance: settings.appearance,
      returnMethod: settings.returnMethod,
      pushSettings: settings.pushSettings,
      dataSourceSettings: settings.dataSourceSettings,
      scheduledJobSettings: settings.scheduledJobSettings,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const result = await validateBody(request, settingsUpdateSchema);
    if ("error" in result) return result.error;

    const existing = await prisma.appSettings.findFirst();
    if (!existing) {
      return createErrorResponse({ code: "NOT_FOUND", message: "请先初始化设置" }, 404);
    }

    const updated = await prisma.appSettings.update({
      where: { id: existing.id },
      data: result.data as any,
    });

    return createSuccessResponse({ id: updated.id });
  } catch (err) {
    return handleApiError(err);
  }
}
