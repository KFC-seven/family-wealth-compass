/** 允许的 MIME 类型 */
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** 默认最大文件大小 (bytes) */
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** 允许的扩展名 */
export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export function validateFileSize(size: number, maxSize?: number): { valid: boolean; message?: string } {
  const limit = maxSize ?? DEFAULT_MAX_FILE_SIZE;
  if (size > limit) {
    return { valid: false, message: `文件过大 (${(size / 1024 / 1024).toFixed(1)}MB)，限制 ${(limit / 1024 / 1024).toFixed(0)}MB` };
  }
  return { valid: true };
}

export function validateMimeType(mimeType: string): { valid: boolean; message?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, message: `不支持的文件类型: ${mimeType}，仅允许 ${ALLOWED_MIME_TYPES.join(", ")}` };
  }
  return { valid: true };
}

export function validateExtension(fileName: string): { valid: boolean; message?: string } {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, message: `不支持的文件扩展名: ${ext}` };
  }
  return { valid: true };
}
