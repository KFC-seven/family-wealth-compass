import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { FileStorageProvider, SaveFileInput, SavedFile } from "../types";
import { computeHash } from "../file-hash";

/** 本地磁盘存储 provider。
 * 文件存到 `{uploadDir}/imports/YYYY/MM/{hash}_{safeName}`。
 */
export class LocalStorageProvider implements FileStorageProvider {
  name = "local";

  constructor(private uploadDir: string = "./uploads") {}

  async save(input: SaveFileInput): Promise<SavedFile> {
    const now = new Date();
    const monthDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const dir = path.join(this.uploadDir, "imports", monthDir);
    await fs.mkdir(dir, { recursive: true });

    const hash = computeHash(input.buffer);
    const ext = path.extname(input.originalFileName).toLowerCase() || ".bin";
    const safeName = `${hash.slice(0, 16)}${ext}`;
    const filePath = path.join(dir, safeName);

    // 防止路径穿越
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(this.uploadDir))) {
      throw new Error("路径穿越检测");
    }

    await fs.writeFile(resolved, input.buffer);

    return {
      storageProvider: this.name,
      storageKey: resolved,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
      hash,
      url: undefined,
    };
  }

  async delete(storageKey: string): Promise<void> {
    await fs.unlink(storageKey).catch(() => {});
  }
}
