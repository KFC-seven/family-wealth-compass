import type { AssetTypeEnum } from "@/generated/prisma/client";
import type {
  MarketDataProvider,
  MarketAsset,
  MarketPriceResult,
  DataSourceResolution,
  MarketDataProviderHealth,
} from "./types";
import { MockMarketDataProvider } from "./providers/mock-provider";
import { ManualPriceProvider } from "./providers/manual-provider";
import { EastmoneyFundProvider } from "./providers/eastmoney-fund-provider";
import { TushareProvider } from "./providers/tushare-provider";
import { SinaFinanceProvider } from "./providers/sina-finance-provider";
import { ProviderUnavailableError } from "./errors";
import { prisma } from "@/server/db/prisma";

/** 全局 provider 注册表 */
const providerMap = new Map<string, MarketDataProvider>();

function initProviders() {
  if (providerMap.size > 0) return;

  const providers: MarketDataProvider[] = [
    new MockMarketDataProvider(),
    new ManualPriceProvider(),
    new EastmoneyFundProvider(),
    new TushareProvider(),
    new SinaFinanceProvider(),
  ];

  for (const p of providers) {
    providerMap.set(p.name, p);
  }
}

/** 获取所有已注册 provider */
export function getAllProviders(): MarketDataProvider[] {
  initProviders();
  return Array.from(providerMap.values());
}

/** 按名称获取 provider */
export function getProvider(name: string): MarketDataProvider | undefined {
  initProviders();
  return providerMap.get(name);
}

/**
 * 根据资产类型和数据源优先级选择 provider。
 *
 * 策略：
 * 1. 读取数据库中该资产类型的 MarketDataSource 配置，按 priority 排序。
 * 2. 从上到下尝试，第一个可用即返回。
 * 3. 如果全部真实 provider 失败，fallback 到 mock。
 * 4. 如果 mock 也失败（不太可能），fallback 到 manual。
 */
export async function resolveProviderForAsset(
  asset: MarketAsset,
): Promise<DataSourceResolution> {
  initProviders();

  // 查找数据库中的数据源配置
  const marketMode = process.env.MARKET_DATA_MODE ?? "mock";

  if (marketMode === "mock") {
    const mock = providerMap.get("mock")!;
    return {
      provider: mock,
      sourceName: "mock",
      fallback: false,
    };
  }

  // mixed / real mode：查询 DB 配置
  const dbSource = await prisma.marketDataSource.findFirst({
    where: {
      isEnabled: true,
    },
    orderBy: { priority: "asc" },
  });

  if (dbSource && marketMode !== "mock") {
    const assets = dbSource.supportedAssetTypes as AssetTypeEnum[];
    if (!assets || assets.length === 0 || assets.includes(asset.type)) {
      const provider = providerMap.get(dbSource.name);
      if (provider && (await provider.isEnabled())) {
        return { provider, sourceName: dbSource.name, fallback: false };
      }
    }
  }

  // Fallback chain: mock → manual
  const mock = providerMap.get("mock")!;
  if (await mock.isEnabled()) {
    return { provider: mock, sourceName: "mock", fallback: true };
  }

  const manual = providerMap.get("manual")!;
  return { provider: manual, sourceName: "manual", fallback: true };
}

/**
 * 安全获取行情，含异常捕获和 fallback。
 */
export async function safeGetPrice(asset: MarketAsset): Promise<MarketPriceResult> {
  try {
    const resolution = await resolveProviderForAsset(asset);
    return await resolution.provider.getLatestPrice(asset);
  } catch {
    // 最后的兜底
    const mock = providerMap.get("mock")!;
    return mock.getLatestPrice(asset);
  }
}

/** 全部 provider 健康检查 */
export async function healthCheckAll(): Promise<Record<string, MarketDataProviderHealth>> {
  initProviders();
  const results: Record<string, MarketDataProviderHealth> = {};
  for (const [name, p] of providerMap) {
    try {
      results[name] = p.healthCheck
        ? await p.healthCheck()
        : {
            status: "HEALTHY" as const,
            checkedAt: new Date().toISOString(),
            message: "无 healthCheck 实现",
          };
    } catch (e) {
      results[name] = {
        status: "FAILED",
        message: (e as Error).message,
        checkedAt: new Date().toISOString(),
      };
    }
  }
  return results;
}
