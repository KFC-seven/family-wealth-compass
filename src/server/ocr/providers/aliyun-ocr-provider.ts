import crypto from "node:crypto";
import https from "node:https";
import type {
  OcrProvider,
  OcrRecognizeInput,
  OcrRecognizeResult,
  OcrProviderHealth,
} from "../types";
import { parseOcrTextWithAI } from "../ocr-parser";

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A")
    .replace(/\+/g, "%20");
}

function buildSignature(
  params: Record<string, string>,
  secret: string,
  method: string,
): string {
  const sortedKeys = Object.keys(params).sort();
  const canonicalized = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");
  const stringToSign = `${method}&${percentEncode("/")}&${percentEncode(canonicalized)}`;
  const hmac = crypto.createHmac("sha1", `${secret}&`);
  hmac.update(stringToSign);
  return hmac.digest("base64");
}

function makeHttpsRequest(
  hostname: string,
  path: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        port: 443,
        path,
        method: "POST",
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(body.length),
        },
        timeout: 30000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode !== 200) {
            reject(new Error(`Aliyun OCR HTTP ${res.statusCode}: ${raw.slice(0, 500)}`));
            return;
          }
          resolve(raw);
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Aliyun OCR 请求超时"));
    });
    req.write(body);
    req.end();
  });
}



export class AliyunOcrProvider implements OcrProvider {
  name = "aliyun";
  private enabled: boolean;
  private accessKeyId: string;
  private accessKeySecret: string;
  private endpoint: string;

  constructor() {
    this.accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID ?? "";
    this.accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET ?? "";
    this.endpoint = process.env.ALIYUN_OCR_ENDPOINT ?? "ocr-api.cn-hangzhou.aliyuncs.com";
    this.enabled =
      process.env.OCR_PROVIDER === "aliyun" &&
      process.env.OCR_ENABLED === "true" &&
      !!this.accessKeyId &&
      !!this.accessKeySecret &&
      !!this.endpoint;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async recognize(input: OcrRecognizeInput): Promise<OcrRecognizeResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const nonce = crypto.randomUUID();

    const params: Record<string, string> = {
      AccessKeyId: this.accessKeyId,
      Action: "RecognizeAllText",
      Format: "JSON",
      SignatureMethod: "HMAC-SHA1",
      SignatureNonce: nonce,
      SignatureVersion: "1.0",
      Timestamp: timestamp,
      Type: "General",
      Version: "2021-07-07",
    };

    const signature = buildSignature(params, this.accessKeySecret, "POST");
    const query = Object.keys(params)
      .sort()
      .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
      .join("&");
    const path = `/?${query}&Signature=${percentEncode(signature)}`;

    // Aliyun OCR API requires application/octet-stream for binary body
    const respBody = await makeHttpsRequest(
      this.endpoint,
      path,
      input.imageBuffer,
      "application/octet-stream",
    );

    const parsed = JSON.parse(respBody);

    if (parsed.Code) {
      throw new Error(`Aliyun OCR API 错误: ${parsed.Code} — ${parsed.Message ?? ""}`);
    }

    // RecognizeAllText returns Data as an object with SubImages, not a JSON string
    let rawText = "";
    if (typeof parsed.Data === "string") {
      try {
        const d = JSON.parse(parsed.Data);
        rawText = d.content ?? "";
      } catch {
        rawText = parsed.Data;
      }
    } else if (parsed.Data?.SubImages) {
      const blocks = parsed.Data.SubImages[0]?.BlockInfo?.BlockDetails ?? [];
      rawText = blocks.map((b: any) => b.BlockContent ?? "").join("\n");
    }

    // AI-based parsing for structured rows
    const rows = await parseOcrTextWithAI(rawText, input.sourcePlatform);

    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    return {
      provider: "aliyun",
      rawText,
      rawResult: parsed,
      rows,
      confidence: rows.length > 0 ? 85 : 0,
      startedAt,
      finishedAt,
      durationMs,
    };
  }

  async healthCheck(): Promise<OcrProviderHealth> {
    if (!this.enabled) {
      return {
        status: "DISABLED",
        message: "Aliyun OCR 未配置或未启用",
        checkedAt: new Date().toISOString(),
      };
    }
    return {
      status: "HEALTHY",
      message: "Aliyun OCR 已配置并启用",
      checkedAt: new Date().toISOString(),
    };
  }
}
