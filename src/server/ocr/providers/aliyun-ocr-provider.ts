import type { OcrProvider, OcrRecognizeInput, OcrRecognizeResult, OcrProviderHealth } from "../types";

/**
 * 阿里云 OCR provider 骨架。
 *
 * 使用阿里云文档结构化识别或通用文字识别。
 * 需要 ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET / ALIYUN_OCR_ENDPOINT。
 *
 * 真实接入需确认:
 * - OCR 产品类型（文档识别 / 表格识别 / 通用文字）
 * - API 接口格式
 * - 返回结构映射
 * - 费用
 *
 * 本阶段仅配置检测骨架。
 */
export class AliyunOcrProvider implements OcrProvider {
  name = "aliyun";
  private enabled: boolean;

  constructor() {
    this.enabled =
      process.env.OCR_PROVIDER === "aliyun" &&
      process.env.OCR_ENABLED === "true" &&
      !!process.env.ALIYUN_ACCESS_KEY_ID &&
      !!process.env.ALIYUN_ACCESS_KEY_SECRET &&
      !!process.env.ALIYUN_OCR_ENDPOINT;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async recognize(_input: OcrRecognizeInput): Promise<OcrRecognizeResult> {
    // TODO: 实现阿里云 OCR 调用
    // 1. 构建 API 请求签名
    // 2. 发送图片进行文字识别
    // 3. 解析返回结果映射为 OcrRowResult[]
    // 4. 返回 OcrRecognizeResult
    throw new Error("Aliyun OCR provider 本阶段未实现，使用 mock OCR 或配置 OCR_PROVIDER=mock");
  }

  async healthCheck(): Promise<OcrProviderHealth> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "Aliyun OCR 未配置或未启用", checkedAt: new Date().toISOString() };
    }
    return { status: "DEGRADED", message: "Aliyun OCR provider 本阶段仅骨架", checkedAt: new Date().toISOString() };
  }
}
