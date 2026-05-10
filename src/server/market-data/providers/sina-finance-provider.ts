import type { MarketDataProvider, MarketAsset, MarketPriceResult, MarketDataProviderHealth } from "../types";
import type { AssetTypeEnum } from "@/generated/prisma/client";
import { ProviderUnavailableError, ProviderDataError } from "../errors";

const SINA_API = "http://hq.sinajs.cn/list=";
const SINA_REFERER = "https://finance.sina.com.cn";

/**
 * 新浪财经行情 Provider。
 *
 * 免费公开接口，无需注册 / API Key。
 * 覆盖 A 股（沪深）、美股、ETF。
 *
 * 启用条件: MARKET_DATA_ENABLE_SINA_FINANCE=true
 */
export class SinaFinanceProvider implements MarketDataProvider {
  name = "sina-finance";
  supportedAssetTypes: AssetTypeEnum[] = ["A_SHARE", "ETF", "US_STOCK"];

  private enabled: boolean;

  constructor() {
    this.enabled = process.env.MARKET_DATA_ENABLE_SINA_FINANCE === "true";
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async getLatestPrice(asset: MarketAsset): Promise<MarketPriceResult> {
    if (!this.enabled) {
      throw new ProviderUnavailableError(this.name, "Provider 未启用");
    }

    const symbol = buildSinaSymbol(asset);
    if (!symbol) {
      throw new ProviderDataError(this.name, asset.code, "无法确定新浪代码");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(`${SINA_API}${symbol}`, {
        signal: controller.signal,
        headers: { Referer: SINA_REFERER },
      });

      if (!resp.ok) {
        throw new ProviderUnavailableError(this.name, `HTTP ${resp.status}`);
      }

      const text = await resp.text();
      const price = parseSinaResponse(text, symbol);

      if (price === null || price <= 0) {
        throw new ProviderDataError(this.name, asset.code, text.slice(0, 200));
      }

      return {
        assetId: asset.id,
        assetCode: asset.code,
        symbol,
        assetType: asset.type,
        price,
        currency: asset.currency ?? (asset.type === "US_STOCK" ? "USD" : "CNY"),
        priceDate: new Date().toISOString().slice(0, 10),
        source: "sina",
        confidence: 0.85,
        raw: text.slice(0, 500),
      };
    } catch (e) {
      if (e instanceof ProviderUnavailableError || e instanceof ProviderDataError) {
        throw e;
      }
      throw new ProviderUnavailableError(this.name, (e as Error).message);
    } finally {
      clearTimeout(timer);
    }
  }

  async healthCheck(): Promise<MarketDataProviderHealth> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "未启用", checkedAt: new Date().toISOString() };
    }

    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const resp = await fetch(`${SINA_API}sh600519`, {
        signal: controller.signal,
        headers: { Referer: SINA_REFERER },
      });

      if (resp.ok) {
        const text = await resp.text();
        const price = parseSinaResponse(text, "sh600519");
        if (price && price > 0) {
          return {
            status: "HEALTHY",
            message: `贵州茅台: ${price}`,
            checkedAt: new Date().toISOString(),
            latencyMs: Date.now() - start,
          };
        }
        return { status: "DEGRADED", message: "解析失败", checkedAt: new Date().toISOString(), latencyMs: Date.now() - start };
      }
      return { status: "DEGRADED", message: `HTTP ${resp.status}`, checkedAt: new Date().toISOString(), latencyMs: Date.now() - start };
    } catch {
      return { status: "FAILED", message: "新浪财经接口不可达", checkedAt: new Date().toISOString(), latencyMs: Date.now() - start };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** 根据资产代码构造新浪查询 symbol */
function buildSinaSymbol(asset: MarketAsset): string | null {
  const code = asset.code?.trim();
  if (!code) return null;

  // US stock: non-numeric code
  if (!/^\d+$/.test(code)) {
    return `gb_${code.toLowerCase()}`;
  }

  // A-share / ETF: distinguish Shanghai vs Shenzhen by code prefix
  if (/^60[013]/.test(code) || /^68[08]/.test(code)) {
    return `sh${code}`;
  }
  if (/^00[0123]/.test(code) || /^30[02]/.test(code)) {
    return `sz${code}`;
  }
  // ETF may use 5xxxxx codes (Shanghai)
  if (/^5[01]/.test(code)) {
    return `sh${code}`;
  }
  // Default: try Shanghai
  return `sh${code}`;
}

/** 解析新浪返回的 JS var 字符串，提取当前价格 */
function parseSinaResponse(text: string, symbol: string): number | null {
  const regex = new RegExp(`hq_str_${symbol}="([^"]*)"`);
  const match = text.match(regex);
  if (!match) return null;

  const fields = match[1].split(",");
  if (fields.length < 2) return null;

  // A-share (sh/sz): index 3 = current price
  if (symbol.startsWith("sh") || symbol.startsWith("sz")) {
    const price = parseFloat(fields[3]);
    return isNaN(price) ? null : price;
  }

  // US stock (gb_): index 1 = current price
  if (symbol.startsWith("gb_")) {
    const price = parseFloat(fields[1]);
    return isNaN(price) ? null : price;
  }

  return null;
}
