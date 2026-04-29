import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { getOcrProvider } from "@/server/ocr/registry";
import { normalizeOcrRow } from "@/server/ocr/normalize";
import { validateRows } from "@/server/ocr/validation";
import type { OcrRowResult } from "@/server/ocr/types";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const session = await prisma.importSession.findUnique({ where: { id: sessionId } });
    if (!session) return createErrorResponse({ code: "NOT_FOUND", message: "会话不存在" }, 404);

    if (!session.storageKey) {
      return createErrorResponse({ code: "NO_FILE", message: "请先上传文件" }, 400);
    }

    // 读取文件
    const fs = await import("node:fs/promises");
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(session.storageKey);
    } catch {
      return createErrorResponse({ code: "FILE_MISSING", message: "文件已丢失，请重新上传" }, 400);
    }

    const ocr = getOcrProvider();
    const result = await ocr.recognize({
      imageBuffer: buffer,
      mimeType: session.fileMimeType ?? "image/png",
      sourcePlatform: session.sourcePlatform,
      fileName: session.originalFileName ?? "unknown",
    });

    // 标准化
    const normalized = result.rows.map(normalizeOcrRow);
    const validated = validateRows(normalized);

    // 批量创建 RecognizedImportRow
    let i = 0;
    for (const v of validated) {
      const r = v.row;
      i++;
      await prisma.recognizedImportRow.create({
        data: {
          importSessionId: sessionId,
          rowIndex: i,
          sourcePlatform: session.sourcePlatform,
          memberId: null,
          accountId: null,
          assetName: r.assetName,
          assetCode: r.assetCode ?? null,
          assetType: r.assetType,
          currency: r.currency ?? "CNY",
          quantity: r.quantity ? parseFloat(r.quantity) : null,
          price: r.price ? parseFloat(r.price) : null,
          marketValue: r.marketValue ? parseFloat(r.marketValue) : null,
          cost: r.cost ? parseFloat(r.cost) : null,
          holdingReturn: r.holdingReturn ? parseFloat(r.holdingReturn) : null,
          confidence: Math.round(r.confidence),
          rawText: r.rawText,
          normalizedText: JSON.stringify(r),
          validationIssues: v.issues.length > 0 ? (JSON.parse(JSON.stringify(v.issues)) as any) : undefined,
          action: v.action,
          status: v.issues.some((iss) => iss.type === "MISSING")
            ? ("MISSING_FIELDS" as const)
            : v.issues.some((iss) => iss.type === "LOW_CONFIDENCE")
              ? ("LOW_CONFIDENCE" as const)
              : ("NORMAL" as const),
        },
      });
    }

    // 更新 session
    const lowCount = validated.filter((v) => v.issues.some((iss) => iss.type === "LOW_CONFIDENCE")).length;
    const missCount = validated.filter((v) => v.issues.some((iss) => iss.type === "MISSING")).length;
    const dupCount = validated.filter((v) => v.issues.some((iss) => iss.type === "DUPLICATE")).length;

    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        status: "REVIEWING",
        ocrProvider: result.provider,
        ocrStartedAt: new Date(result.startedAt),
        ocrFinishedAt: new Date(result.finishedAt),
        ocrDurationMs: result.durationMs,
        ocrRawResult: result.rawResult ?? undefined,
        recognizedRowCount: validated.length,
        lowConfidenceCount: lowCount,
        missingFieldCount: missCount,
        duplicateCount: dupCount,
      },
    });

    return createSuccessResponse({
      provider: result.provider,
      rowCount: validated.length,
      confidence: result.confidence,
      durationMs: result.durationMs,
      lowConfidenceCount: lowCount,
      missingFieldCount: missCount,
      duplicateCount: dupCount,
    });
  } catch (err) {
    // 识别失败不改变 session 基本状态，前端仍可手动新增
    return handleApiError(err);
  }
}
