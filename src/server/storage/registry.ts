import type { FileStorageProvider } from "./types";
import { LocalStorageProvider } from "./providers/local-storage-provider";
import { AliyunOssStorageProvider } from "./providers/aliyun-oss-storage-provider";

let storage: FileStorageProvider | null = null;

export function getStorageProvider(): FileStorageProvider {
  if (storage) return storage;

  const provider = process.env.UPLOAD_STORAGE_PROVIDER ?? "local";

  if (provider === "aliyun-oss") {
    const oss = new AliyunOssStorageProvider();
    if (oss.isEnabled) {
      storage = oss;
      return storage;
    }
    console.warn("[Storage] Aliyun OSS 未配置，fallback 到本地存储");
  }

  storage = new LocalStorageProvider(process.env.LOCAL_UPLOAD_DIR ?? "./uploads");
  return storage;
}
