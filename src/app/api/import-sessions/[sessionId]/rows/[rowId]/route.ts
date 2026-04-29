import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";

/** 编辑识别行 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string; rowId: string }> },
) {
  try {
    const { sessionId, rowId } = await params;
    const row = await prisma.recognizedImportRow.findUnique({ where: { id: rowId } });
    if (!row || row.importSessionId !== sessionId) {
      return createErrorResponse({ code: "NOT_FOUND", message: "行不存在" }, 404);
    }

    const body = await req.json();
    const updated = await prisma.recognizedImportRow.update({
      where: { id: rowId },
      data: {
        memberId: body.memberId !== undefined ? body.memberId : undefined,
        accountId: body.accountId !== undefined ? body.accountId : undefined,
        assetName: body.assetName,
        assetCode: body.assetCode,
        assetType: body.assetType,
        currency: body.currency,
        quantity: body.quantity !== undefined ? (body.quantity != null ? parseFloat(body.quantity) : null) : undefined,
        price: body.price !== undefined ? (body.price != null ? parseFloat(body.price) : null) : undefined,
        marketValue: body.marketValue !== undefined ? (body.marketValue != null ? parseFloat(body.marketValue) : null) : undefined,
        cost: body.cost !== undefined ? (body.cost != null ? parseFloat(body.cost) : null) : undefined,
        holdingReturn: body.holdingReturn !== undefined ? (body.holdingReturn != null ? parseFloat(body.holdingReturn) : null) : undefined,
        dataDate: body.dataDate ? new Date(body.dataDate) : undefined,
        status: body.status ?? "CONFIRMED",
        action: body.action,
        note: body.note,
        validationIssues: body.validationIssues,
      },
    });

    return createSuccessResponse({ id: updated.id });
  } catch (err) {
    return handleApiError(err);
  }
}

/** 删除识别行 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string; rowId: string }> },
) {
  try {
    const { sessionId, rowId } = await params;
    const row = await prisma.recognizedImportRow.findUnique({ where: { id: rowId } });
    if (!row || row.importSessionId !== sessionId) {
      return createErrorResponse({ code: "NOT_FOUND", message: "行不存在" }, 404);
    }

    await prisma.recognizedImportRow.delete({ where: { id: rowId } });
    await prisma.importSession.update({
      where: { id: sessionId },
      data: { recognizedRowCount: { decrement: 1 } },
    });

    return createSuccessResponse({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
