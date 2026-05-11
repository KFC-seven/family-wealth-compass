import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { getOcrProvider } from "@/server/ocr/registry";
import { normalizeOcrRow } from "@/server/ocr/normalize";
import { validateRows } from "@/server/ocr/validation";
import type { OcrRowResult } from "@/server/ocr/types";

function parseStorageKeys(key: string): string[] {
  const trimmed = key.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [trimmed];
    } catch { /* fall through */ }
  }
  return [trimmed];
}

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

    const storageKeys = parseStorageKeys(session.storageKey);

    // Read all files
    const fs = await import("node:fs/promises");
    const buffers: Buffer[] = [];
    for (const key of storageKeys) {
      try {
        buffers.push(await fs.readFile(key));
      } catch {
        return createErrorResponse({ code: "FILE_MISSING", message: `文件已丢失，请重新上传` }, 400);
      }
    }

    // OCR all files with concurrency limit
    const ocr = getOcrProvider();
    const concurrency = parseInt(process.env.OCR_CONCURRENCY ?? "3", 10);
    const allRows: OcrRowResult[] = [];
    const results: { provider: string; startedAt: string; finishedAt: string; durationMs: number }[] = [];
    let totalDurationMs = 0;

    for (let i = 0; i < buffers.length; i += concurrency) {
      const batch = buffers.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((buffer, batchIdx) =>
          ocr.recognize({
            imageBuffer: buffer,
            mimeType: session.fileMimeType ?? "image/png",
            sourcePlatform: session.sourcePlatform,
            fileName: `${session.originalFileName ?? "file"}_${i + batchIdx}`,
          }),
        ),
      );
      for (const r of batchResults) {
        allRows.push(...r.rows);
        results.push({
          provider: r.provider,
          startedAt: r.startedAt,
          finishedAt: r.finishedAt,
          durationMs: r.durationMs,
        });
        totalDurationMs += r.durationMs;
      }
    }

    // Normalize and validate all rows together (cross-file dedup)
    const normalized = allRows.map(normalizeOcrRow);
    const validated = validateRows(normalized);

    // Create RecognizedImportRow records (sequential rowIndex)
    let rowIdx = 0;
    for (const v of validated) {
      const r = v.row;
      rowIdx++;
      await prisma.recognizedImportRow.create({
        data: {
          importSessionId: sessionId,
          rowIndex: rowIdx,
          sourcePlatform: session.sourcePlatform,
          memberId: r.member ?? null,
          accountId: r.account ?? null,
          assetName: r.assetName,
          assetCode: r.assetCode ?? null,
          assetType: r.assetType,
          currency: r.currency ?? "CNY",
          quantity: r.quantity != null ? parseFloat(r.quantity) : null,
          price: r.price != null ? parseFloat(r.price) : null,
          marketValue: r.marketValue != null ? parseFloat(r.marketValue) : null,
          cost: r.cost != null ? parseFloat(r.cost) : null,
          holdingReturn: r.holdingReturn != null ? parseFloat(r.holdingReturn) : null,
          holdingReturnRate: r.holdingReturnRate ? parseFloat(String(r.holdingReturnRate).replace("%", "")) : null,
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

    const lowCount = validated.filter((v) => v.issues.some((iss) => iss.type === "LOW_CONFIDENCE")).length;
    const missCount = validated.filter((v) => v.issues.some((iss) => iss.type === "MISSING")).length;
    const dupCount = validated.filter((v) => v.issues.some((iss) => iss.type === "DUPLICATE")).length;

    const primaryResult = results[0] ?? { provider: "unknown", startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 0 };

    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        status: "REVIEWING",
        ocrProvider: primaryResult.provider,
        ocrStartedAt: new Date(primaryResult.startedAt),
        ocrFinishedAt: new Date(primaryResult.finishedAt),
        ocrDurationMs: totalDurationMs,
        ocrRawResult: results as any,
        recognizedRowCount: validated.length,
        lowConfidenceCount: lowCount,
        missingFieldCount: missCount,
        duplicateCount: dupCount,
      },
    });

    return createSuccessResponse({
      provider: primaryResult.provider,
      rowCount: validated.length,
      confidence: validated.length > 0 ? 85 : 0,
      durationMs: totalDurationMs,
      lowConfidenceCount: lowCount,
      missingFieldCount: missCount,
      duplicateCount: dupCount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
