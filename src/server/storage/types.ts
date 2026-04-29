/** 文件存储 provider 输入 */
export interface SaveFileInput {
  buffer: Buffer;
  originalFileName: string;
  mimeType: string;
}

/** 已保存文件信息 */
export interface SavedFile {
  storageProvider: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  hash: string;
  url?: string;
}

/** 文件存储 provider 接口 */
export interface FileStorageProvider {
  name: string;
  save(input: SaveFileInput): Promise<SavedFile>;
  getSignedUrl?(storageKey: string): Promise<string>;
  delete?(storageKey: string): Promise<void>;
}
