import type { OcrProvider } from "./types";
import { MockOcrProvider } from "./providers/mock-ocr-provider";
import { AliyunOcrProvider } from "./providers/aliyun-ocr-provider";

let ocr: OcrProvider | null = null;

export function getOcrProvider(): OcrProvider {
  if (ocr) return ocr;

  const provider = process.env.OCR_PROVIDER ?? "mock";
  const enabled = process.env.OCR_ENABLED === "true";

  if (provider === "aliyun" && enabled) {
    const aliyun = new AliyunOcrProvider();
    if (aliyun.isEnabled()) {
      ocr = aliyun;
      return ocr;
    }
    console.warn("[OCR] Aliyun OCR 未完整配置，fallback 到 mock");
  }

  ocr = new MockOcrProvider();
  return ocr;
}
