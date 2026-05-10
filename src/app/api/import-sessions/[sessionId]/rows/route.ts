import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";

const ROW_FIELDS = [
  "memberId", "accountId", "assetName", "assetCode", "assetType",
  "currency", "market", "quantity", "price", "marketValue", "cost",
  "holdingReturn", "dataDate", "confidence", "status", "action",
  "rawText", "normalizedText", "note", "validationIssues",
  // transaction fields
  "transactionType", "tradeDate", "grossAmount", "fee", "tax",
  "netAmount", "cashImpact", "realizedReturn",
] as const;

/** 手动新增一行或批量多行 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await prisma.importSession.findUnique({ where: { id: sessionId } });
    if (!session) return createErrorResponse({ code: "NOT_FOUND", message: "会话不存在" }, 404);

    const body = await req.json();

    // 支持批量: { rows: [...] }
    const entries = Array.isArray(body.rows) ? body.rows : [body];
    if (entries.length === 0) {
      return createErrorResponse({ code: "VALIDATION_ERROR", message: "rows 不能为空" }, 400);
    }

    // 计算当前最大 rowIndex
    const maxRow = await prisma.recognizedImportRow.findFirst({
      where: { importSessionId: sessionId },
      orderBy: { rowIndex: "desc" as const },
    });
    let nextIndex = (maxRow?.rowIndex ?? 0);

    const createdIds: string[] = [];

    for (const entry of entries) {
      nextIndex++;

      const data: Record<string, unknown> = {
        importSessionId: sessionId,
        rowIndex: nextIndex,
        sourcePlatform: entry.sourcePlatform ?? session.sourcePlatform,
        confidence: entry.confidence ?? 100,
        assetName: entry.assetName ?? "",
        assetType: entry.assetType ?? "OTHER",
      };

      for (const f of ROW_FIELDS) {
        if (f in entry && entry[f] !== undefined) {
          if (f === "dataDate" || f === "tradeDate") {
            data[f] = entry[f] ? new Date(entry[f] as string) : null;
          } else if (["quantity", "price", "marketValue", "cost", "holdingReturn", "grossAmount", "fee", "tax", "netAmount", "cashImpact", "realizedReturn"].includes(f)) {
            data[f] = entry[f] != null ? parseFloat(String(entry[f])) : null;
          } else {
            data[f] = entry[f];
          }
        }
      }

      const row = await prisma.recognizedImportRow.create({ data: data as any });
      createdIds.push(row.id);
    }

    await prisma.importSession.update({
      where: { id: sessionId },
      data: { recognizedRowCount: { increment: entries.length } },
    });

    return createSuccessResponse(
      entries.length === 1 ? { id: createdIds[0] } : { ids: createdIds, count: createdIds.length },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
