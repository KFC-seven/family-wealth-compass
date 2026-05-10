import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    asset: { findMany: vi.fn() },
    priceSnapshot: { upsert: vi.fn() },
    holding: { updateMany: vi.fn() },
  },
}));

const { mockSafeGetPrice } = vi.hoisted(() => ({
  mockSafeGetPrice: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/server/market-data/registry", () => ({ safeGetPrice: mockSafeGetPrice }));

import { updateMarketPricesJob } from "../../tasks/update-market-prices";
import type { JobContext } from "../../types";

function makeCtx(overrides: Partial<JobContext> = {}): JobContext {
  return { jobName: "update-market-prices", trigger: "SCHEDULER", jobRunId: "run-001", ...overrides };
}

function makeAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: "ast-001",
    code: "600001",
    symbol: "600001.SH",
    type: "A_SHARE",
    market: "SH",
    currency: "CNY",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateMarketPricesJob", () => {
  it("returns SKIPPED when no updatable assets exist", async () => {
    mockPrisma.asset.findMany.mockResolvedValue([
      makeAsset({ id: "ast-cash", type: "CASH", code: null, symbol: null, market: null }),
      makeAsset({ id: "ast-bank", type: "BANK_WEALTH", code: null, symbol: null, market: null }),
    ]);

    const result = await updateMarketPricesJob.execute(makeCtx());

    expect(result.status).toBe("SKIPPED");
    expect(result.skippedCount).toBe(2);
    expect(result.metadata).toEqual(
      expect.objectContaining({ reason: "无可自动更新的资产" }),
    );
    expect(mockSafeGetPrice).not.toHaveBeenCalled();
  });

  it("filters out CASH and BANK_WEALTH from updatable set", async () => {
    mockPrisma.asset.findMany.mockResolvedValue([
      makeAsset({ id: "ast-cash", type: "CASH" }),
      makeAsset({ id: "ast-stock", type: "A_SHARE" }),
      makeAsset({ id: "ast-bank", type: "BANK_WEALTH" }),
      makeAsset({ id: "ast-fund", type: "MUTUAL_FUND" }),
    ]);
    mockSafeGetPrice.mockResolvedValue({
      assetId: "ast-stock", assetCode: "600001", assetType: "A_SHARE",
      price: 10.5, currency: "CNY", priceDate: "2026-05-11", source: "sina",
    });
    mockSafeGetPrice.mockResolvedValue({
      assetId: "ast-fund", assetCode: "000001", assetType: "MUTUAL_FUND",
      price: 1.5, currency: "CNY", priceDate: "2026-05-11", source: "eastmoney",
    });
    mockPrisma.priceSnapshot.upsert.mockResolvedValue({});
    mockPrisma.holding.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateMarketPricesJob.execute(makeCtx());

    // 2 updatable (A_SHARE, MUTUAL_FUND), 2 skipped (CASH, BANK_WEALTH)
    expect(result.successCount).toBe(2);
    expect(result.skippedCount).toBe(2);
    expect(mockSafeGetPrice).toHaveBeenCalledTimes(2);
  });

  it("returns SUCCESS when all updatable assets update successfully", async () => {
    mockPrisma.asset.findMany.mockResolvedValue([
      makeAsset({ id: "ast-001", code: "600001", type: "A_SHARE" }),
    ]);
    mockSafeGetPrice.mockResolvedValue({
      assetId: "ast-001", assetCode: "600001", assetType: "A_SHARE",
      price: 15.0, currency: "CNY", priceDate: "2026-05-11", source: "sina",
    });
    mockPrisma.priceSnapshot.upsert.mockResolvedValue({});
    mockPrisma.holding.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateMarketPricesJob.execute(makeCtx());

    expect(result.status).toBe("SUCCESS");
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
  });

  it("skips assets with invalid prices (not counted as failure)", async () => {
    mockPrisma.asset.findMany.mockResolvedValue([
      makeAsset({ id: "ast-001", code: "600001" }),
    ]);
    mockSafeGetPrice.mockResolvedValue({
      assetId: "ast-001", assetCode: "600001", assetType: "A_SHARE",
      price: 0, currency: "CNY", priceDate: "2026-05-11", source: "sina",
    });

    const result = await updateMarketPricesJob.execute(makeCtx());

    expect(result.status).toBe("SUCCESS");
    expect(result.successCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(mockPrisma.priceSnapshot.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.holding.updateMany).not.toHaveBeenCalled();
  });

  it("returns PARTIAL when some assets fail", async () => {
    mockPrisma.asset.findMany.mockResolvedValue([
      makeAsset({ id: "ast-001", code: "600001" }),
      makeAsset({ id: "ast-002", code: "600002" }),
    ]);
    mockSafeGetPrice
      .mockResolvedValueOnce({
        assetId: "ast-001", assetCode: "600001", assetType: "A_SHARE",
        price: 10.0, currency: "CNY", priceDate: "2026-05-11", source: "sina",
      })
      .mockRejectedValueOnce(new Error("API timeout"));
    mockPrisma.priceSnapshot.upsert.mockResolvedValue({});
    mockPrisma.holding.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateMarketPricesJob.execute(makeCtx());

    expect(result.status).toBe("PARTIAL");
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
  });

  it("returns FAILED when all updatable assets fail", async () => {
    mockPrisma.asset.findMany.mockResolvedValue([
      makeAsset({ id: "ast-001", code: "600001" }),
      makeAsset({ id: "ast-002", code: "600002" }),
    ]);
    mockSafeGetPrice.mockRejectedValue(new Error("network error"));

    const result = await updateMarketPricesJob.execute(makeCtx());

    expect(result.status).toBe("FAILED");
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(2);
    expect(result.errorMessage).toBe("全部资产更新失败");
  });

  it("writes PriceSnapshot via upsert and updates Holding prices", async () => {
    mockPrisma.asset.findMany.mockResolvedValue([
      makeAsset({ id: "ast-001", code: "600001" }),
    ]);
    mockSafeGetPrice.mockResolvedValue({
      assetId: "ast-001", assetCode: "600001", assetType: "A_SHARE",
      price: 20.0, currency: "CNY", priceDate: "2026-05-11", source: "sina",
    });
    mockPrisma.priceSnapshot.upsert.mockResolvedValue({});
    mockPrisma.holding.updateMany.mockResolvedValue({ count: 3 });

    await updateMarketPricesJob.execute(makeCtx({ date: "2026-05-11" }));

    expect(mockPrisma.priceSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assetId_date: { assetId: "ast-001", date: expect.any(Date) } },
        update: expect.objectContaining({ price: 20.0, currency: "CNY", source: "MARKET_API" }),
        create: expect.objectContaining({ assetId: "ast-001", price: 20.0 }),
      }),
    );
    expect(mockPrisma.holding.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assetId: "ast-001", status: "CURRENT" },
        data: expect.objectContaining({ currentPrice: 20.0, latestPriceDate: expect.any(Date) }),
      }),
    );
  });
});
