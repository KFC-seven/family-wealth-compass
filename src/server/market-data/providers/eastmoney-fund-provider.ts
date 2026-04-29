import type { MarketDataProvider, MarketAsset, MarketPriceResult, MarketDataProviderHealth } from "../types";
import type { AssetTypeEnum } from "@/generated/prisma/client";
import { ProviderUnavailableError, ProviderDataError } from "../errors";

const EASTMONEY_FUND_API = "https://fundgz.1234567.com.cn/js";

/**
 * 天天基金（Eastmoney）净值接口 provider。
 *
 * 使用东方财富的公开 JSONP 接口获取基金估算/最新净值。
 * **注意：这是第三方公开数据接口，稳定性和使用条款需自行确认。**
 * 家庭自用场景请谨慎使用，不要用于高频商业用途。
 *
 * 仅在环境变量 MARKET_DATA_ENABLE_EASTMONEY_FUND=true 时启用。
 */
export class EastmoneyFundProvider implements MarketDataProvider {
  name = "eastmoney-fund";
  supportedAssetTypes: AssetTypeEnum[] = ["MUTUAL_FUND"];

  private enabled: boolean;

  constructor() {
    this.enabled = process.env.MARKET_DATA_ENABLE_EASTMONEY_FUND === "true";
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async getLatestPrice(asset: MarketAsset): Promise<MarketPriceResult> {
    if (!this.enabled) {
      throw new ProviderUnavailableError(this.name, "Provider 未启用");
    }

    const code = asset.code;
    if (!code || code.length < 6) {
      throw new ProviderDataError(this.name, code, "基金代码无效");
    }

    try {
      const url = `${EASTMONEY_FUND_API}/${code}.js`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!resp.ok) {
        throw new ProviderUnavailableError(this.name, `HTTP ${resp.status}`);
      }

      const text = await resp.text();

      // 天天基金返回 JSONP: jsonpgz({...});
      const jsonMatch = text.match(/jsonpgz\((.+)\)/);
      if (!jsonMatch) {
        throw new ProviderDataError(this.name, code, text.slice(0, 200));
      }

      const data = JSON.parse(jsonMatch[1]);
      const nav = parseFloat(data.dwjz ?? data.jjjz);
      const date = data.jzrq ?? new Date().toISOString().slice(0, 10);

      if (!nav || nav <= 0) {
        throw new ProviderDataError(this.name, code, data);
      }

      return {
        assetId: asset.id,
        assetCode: code,
        assetType: asset.type,
        price: nav,
        currency: asset.currency ?? "CNY",
        priceDate: date,
        source: "eastmoney",
        confidence: 0.9,
        raw: data,
        warning: data.gszzl ? `估算涨幅: ${data.gszzl}%` : undefined,
      };
    } catch (e) {
      if (e instanceof ProviderUnavailableError || e instanceof ProviderDataError) {
        throw e;
      }
      throw new ProviderUnavailableError(this.name, (e as Error).message);
    }
  }

  async healthCheck(): Promise<MarketDataProviderHealth> {
    if (!this.enabled) {
      return { status: "DISABLED", message: "未启用", checkedAt: new Date().toISOString() };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(`${EASTMONEY_FUND_API}/000001.js`, { signal: controller.signal });
      clearTimeout(timer);

      if (resp.ok) {
        return {
          status: "HEALTHY",
          message: "天天基金接口可访问",
          checkedAt: new Date().toISOString(),
          latencyMs: Date.now() - start,
        };
      }
      return {
        status: "DEGRADED",
        message: `HTTP ${resp.status}`,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        status: "FAILED",
        message: "天天基金接口不可达",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    }
  }
}
