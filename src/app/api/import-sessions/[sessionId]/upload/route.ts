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

    // 上传开关检查
    if (process.env.UPLOAD_ENABLED !== "true") {
      return createErrorResponse({ code: "UPLOAD_DISABLED", message: "上传功能未启用，请设置 UPLOAD_ENABLED=true" }, 400);
    }

    // Secret 检查
    const secret = process.env.UPLOAD_API_SECRET;
    if (secret) {
      const provided = req.headers.get("x-upload-api-secret");
      if (provided !== secret) {
        return createErrorResponse({ code: "UNAUTHORIZED", message: "UPLOAD_API_SECRET 校验失败" }, 401);
      }
    }

    const session = await prisma.importSession.findUnique({ where: { id: sessionId } });
    if (!session) return createErrorResponse({ code: "NOT_FOUND", message: "会话不存在" }, 404);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return createErrorResponse({ code: "VALIDATION_ERROR", message: "缺少文件" }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    const originalName = file.name;

    // 校验
    const sizeCheck = validateFileSize(buffer.length);
    if (!sizeCheck.valid) return createErrorResponse({ code: "VALIDATION_ERROR", message: sizeCheck.message! }, 400);

    const mimeCheck = validateMimeType(mimeType);
    if (!mimeCheck.valid) return createErrorResponse({ code: "VALIDATION_ERROR", message: mimeCheck.message! }, 400);

    const extCheck = validateExtension(originalName);
    if (!extCheck.valid) return createErrorResponse({ code: "VALIDATION_ERROR", message: extCheck.message! }, 400);

    // 存储
    const storage = getStorageProvider();
    const saved = await storage.save({ buffer, originalFileName: originalName, mimeType });

    // 更新 session
    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        originalFileName: saved.originalFileName,
        fileMimeType: saved.mimeType,
        fileSizeBytes: saved.sizeBytes,
        fileHash: saved.hash,
        storageProvider: saved.storageProvider,
        storageKey: saved.storageKey,
        fileUrl: saved.url,
        status: "UPLOADED",
      },
    });

    return createSuccessResponse({
      fileName: saved.originalFileName,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
