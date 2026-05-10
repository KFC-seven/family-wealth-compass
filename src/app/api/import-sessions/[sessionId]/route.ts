import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
      include: { recognizedRows: { orderBy: { rowIndex: "asc" as const } } },
    });
    if (!session) return createErrorResponse({ code: "NOT_FOUND", message: "会话不存在" }, 404);

    return createSuccessResponse({
      id: session.id,
      householdId: session.householdId,
      memberId: session.memberId,
      sourcePlatform: session.sourcePlatform,
      saveMode: session.saveMode,
      status: session.status,
      originalFileName: session.originalFileName,
      fileMimeType: session.fileMimeType,
      fileSizeBytes: session.fileSizeBytes,
      fileUrl: session.fileUrl,
      ocrProvider: session.ocrProvider,
      ocrDurationMs: session.ocrDurationMs,
      reviewStatus: session.reviewStatus,
      recognizedRowCount: session.recognizedRowCount,
      savedRowCount: session.savedRowCount,
      ignoredRowCount: session.ignoredRowCount,
      lowConfidenceCount: session.lowConfidenceCount,
      missingFieldCount: session.missingFieldCount,
      duplicateCount: session.duplicateCount,
      savedAt: session.savedAt?.toISOString() ?? null,
      errorMessage: session.errorMessage,
      createdAt: session.createdAt.toISOString(),
      rows: session.recognizedRows.map((r) => ({
        id: r.id,
        rowIndex: r.rowIndex,
        memberId: r.memberId,
        accountId: r.accountId,
        assetName: r.assetName,
        assetCode: r.assetCode,
        assetType: r.assetType,
        currency: r.currency,
        market: r.market,
        quantity: r.quantity?.toString() ?? null,
        price: r.price?.toString() ?? null,
        marketValue: r.marketValue?.toString() ?? null,
        cost: r.cost?.toString() ?? null,
        holdingReturn: r.holdingReturn?.toString() ?? null,
        holdingReturnRate: r.holdingReturnRate?.toString() ?? null,
        dataDate: r.dataDate?.toISOString() ?? null,
        confidence: r.confidence,
        status: r.status,
        validationIssues: r.validationIssues,
        action: r.action,
        note: r.note,
        // 交易字段
        transactionType: r.transactionType,
        tradeDate: r.tradeDate?.toISOString() ?? null,
        grossAmount: r.grossAmount?.toString() ?? null,
        fee: r.fee?.toString() ?? null,
        tax: r.tax?.toString() ?? null,
        netAmount: r.netAmount?.toString() ?? null,
        cashImpact: r.cashImpact?.toString() ?? null,
        realizedReturn: r.realizedReturn?.toString() ?? null,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
