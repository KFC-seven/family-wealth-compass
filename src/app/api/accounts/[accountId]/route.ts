import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { validateBody } from "@/server/api/validators";
import { accountUpdateSchema } from "@/server/api/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const result = await validateBody(request, accountUpdateSchema);
    if ("error" in result) return result.error;

    const existing = await prisma.account.findUnique({ where: { id: accountId } });
    if (!existing) {
      return createErrorResponse({ code: "NOT_FOUND", message: "账户不存在" }, 404);
    }

    const updated = await prisma.account.update({
      where: { id: accountId },
      data: result.data as any,
    });

    return createSuccessResponse({
      id: updated.id,
      includeInTotal: updated.includeInTotal,
      isActive: updated.isActive,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
