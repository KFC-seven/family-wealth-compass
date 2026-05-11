import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { validateBody } from "@/server/api/validators";
import { householdUpdateSchema } from "@/server/api/validators";

export async function PATCH(request: Request) {
  try {
    const result = await validateBody(request, householdUpdateSchema);
    if ("error" in result) return result.error;

    const { totalAssetsDisplay, ...householdFields } = result.data;

    // Update Household table
    const household = await prisma.household.findFirst();
    if (!household) {
      return createErrorResponse({ code: "NOT_FOUND", message: "家庭不存在" }, 404);
    }

    if (Object.keys(householdFields).length > 0) {
      await prisma.household.update({
        where: { id: household.id },
        data: householdFields as any,
      });
    }

    // Update totalAssetsDisplay in AppSettings.appearance
    if (totalAssetsDisplay) {
      const settings = await prisma.appSettings.findFirst();
      if (settings) {
        const appearance = (typeof settings.appearance === "string"
          ? JSON.parse(settings.appearance)
          : Object.assign({}, settings.appearance ?? {})) as Record<string, unknown>;
        appearance.totalAssetsDisplay = totalAssetsDisplay;
        await prisma.appSettings.update({
          where: { id: settings.id },
          data: { appearance: appearance as any },
        });
      }
    }

    return createSuccessResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
