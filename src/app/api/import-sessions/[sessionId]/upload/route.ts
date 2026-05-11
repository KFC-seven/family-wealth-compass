import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { getStorageProvider } from "@/server/storage/registry";
import { validateFileSize, validateMimeType, validateExtension } from "@/server/storage/file-validation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    if (process.env.UPLOAD_ENABLED !== "true") {
      return createErrorResponse({ code: "UPLOAD_DISABLED", message: "上传功能未启用，请设置 UPLOAD_ENABLED=true" }, 400);
    }

    const session = await prisma.importSession.findUnique({ where: { id: sessionId } });
    if (!session) return createErrorResponse({ code: "NOT_FOUND", message: "会话不存在" }, 404);

    const formData = await req.formData();
    const fileEntries = formData.getAll("file") as File[];
    if (!fileEntries || fileEntries.length === 0) {
      return createErrorResponse({ code: "VALIDATION_ERROR", message: "请选择至少一个文件" }, 400);
    }

    // Read all files into memory and validate (fail-fast)
    const files: { buffer: Buffer; mimeType: string; originalName: string }[] = [];
    for (const file of fileEntries) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type;
      const originalName = file.name;

      const sizeCheck = validateFileSize(buffer.length);
      if (!sizeCheck.valid) {
        return createErrorResponse({ code: "VALIDATION_ERROR", message: `${originalName}: ${sizeCheck.message}` }, 400);
      }
      const mimeCheck = validateMimeType(mimeType);
      if (!mimeCheck.valid) {
        return createErrorResponse({ code: "VALIDATION_ERROR", message: `${originalName}: ${mimeCheck.message}` }, 400);
      }
      const extCheck = validateExtension(originalName);
      if (!extCheck.valid) {
        return createErrorResponse({ code: "VALIDATION_ERROR", message: `${originalName}: ${extCheck.message}` }, 400);
      }
      files.push({ buffer, mimeType, originalName });
    }

    // Save all files in parallel
    const storage = getStorageProvider();
    const savedFiles = await Promise.all(
      files.map((f) => storage.save({ buffer: f.buffer, originalFileName: f.originalName, mimeType: f.mimeType })),
    );

    // Store as JSON array for multi-file, plain string for single file
    const storageKeys = savedFiles.map((f) => f.storageKey);
    const storageKey = storageKeys.length === 1 ? storageKeys[0] : JSON.stringify(storageKeys);

    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        originalFileName: savedFiles[0].originalFileName,
        fileMimeType: savedFiles[0].mimeType,
        fileSizeBytes: savedFiles.reduce((sum, f) => sum + f.sizeBytes, 0),
        fileHash: savedFiles[0].hash,
        storageProvider: savedFiles[0].storageProvider,
        storageKey,
        fileUrl: savedFiles[0].url,
        status: "UPLOADED",
      },
    });

    return createSuccessResponse(
      savedFiles.map((f) => ({
        fileName: f.originalFileName,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
      })),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
