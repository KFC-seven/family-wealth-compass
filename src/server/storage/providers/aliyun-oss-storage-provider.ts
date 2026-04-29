import type { FileStorageProvider, SaveFileInput, SavedFile } from "../types";

/**
 * 阿里云 OSS 存储 provider 骨架。
 *
 * 本阶段仅实现配置检测，不要求真实上传成功。
 * 后续接入需要安装 ali-oss SDK 并配置 OSS bucket。
 */
export class AliyunOssStorageProvider implements FileStorageProvider {
  name = "aliyun-oss";
  private enabled: boolean;

  constructor() {
    const hasConfig =
      !!process.env.ALIYUN_ACCESS_KEY_ID &&
      !!process.env.ALIYUN_ACCESS_KEY_SECRET &&
      !!process.env.ALIYUN_OSS_BUCKET &&
      !!process.env.ALIYUN_OSS_ENDPOINT;
    this.enabled = hasConfig;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async save(_input: SaveFileInput): Promise<SavedFile> {
    // TODO: 实现阿里云 OSS 上传
    // 1. 创建 OSS client
    // 2. 生成 storageKey
    // 3. 调用 client.put(storageKey, buffer)
    // 4. 返回 SavedFile
    throw new Error("Aliyun OSS provider 本阶段未实现，请使用 local storage provider");
  }
}
