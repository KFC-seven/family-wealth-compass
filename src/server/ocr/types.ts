import type { ImportSourcePlatform } from "@/generated/prisma/client";

/** OCR 行识别结果 */
export interface OcrRowResult {
  member?: string;
  account?: string;
  assetName: string;
  assetCode?: string;
  assetType: string;
  currency?: string;
  quantity?: string;
  price?: string;
  marketValue?: string;
  cost?: string;
  holdingReturn?: string;
  holdingReturnRate?: string;
  dataDate?: string;
  rawText: string;
  confidence: number;
}

/** OCR 识别输入 */
export interface OcrRecognizeInput {
  imageBuffer: Buffer;
  mimeType: string;
  sourcePlatform: ImportSourcePlatform;
  fileName: string;
}

/** OCR 识别结果 */
export interface OcrRecognizeResult {
  provider: string;
  rawText: string;
  rawResult?: unknown;
  rows: OcrRowResult[];
  confidence: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

/** OCR Provider 健康检查 */
export interface OcrProviderHealth {
  status: "HEALTHY" | "DEGRADED" | "FAILED" | "DISABLED";
  message?: string;
  checkedAt: string;
}

/** OCR Provider 接口 */
export interface OcrProvider {
  name: string;
  isEnabled(): boolean | Promise<boolean>;
  recognize(input: OcrRecognizeInput): Promise<OcrRecognizeResult>;
  healthCheck?(): Promise<OcrProviderHealth>;
}
