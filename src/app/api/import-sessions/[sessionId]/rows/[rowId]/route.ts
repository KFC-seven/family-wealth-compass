import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";

const NUMERIC_FIELDS = [
  "quantity", "price", "marketValue", "cost", "holdingReturn",
  "grossAmount", "fee", "tax", "netAmount", "cashImpact", "realizedReturn",
];

/** 编辑识别行（支持 OCR 行和手动行） */
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

    const data: Record<string, unknown> = {};

    const stringFields = [
      "memberId", "accountId", "assetName", "assetCode", "assetType",
      "currency", "market", "status", "action", "rawText", "normalizedText",
      "note", "transactionType",
    ];
    for (const f of stringFields) {
      if (f in body) data[f] = body[f];
    }

    for (const f of NUMERIC_FIELDS) {
      if (f in body) {
        data[f] = body[f] != null ? parseFloat(String(body[f])) : null;
      }
    }

    if ("dataDate" in body) {
      data.dataDate = body.dataDate ? new Date(body.dataDate) : null;
    }
    if ("tradeDate" in body) {
      data.tradeDate = body.tradeDate ? new Date(body.tradeDate) : null;
    }
    if ("quantity" in body && body.quantity !== undefined) {
      data.quantity = body.quantity != null ? parseFloat(String(body.quantity)) : null;
    }
    if ("validationIssues" in body) {
      data.validationIssues = body.validationIssues;
    }
    if ("fieldConfidences" in body) {
      data.fieldConfidences = body.fieldConfidences;
    }

    const updated = await prisma.recognizedImportRow.update({
      where: { id: rowId },
      data: data as any,
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
