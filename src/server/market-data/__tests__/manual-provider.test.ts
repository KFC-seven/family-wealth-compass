import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    priceSnapshot: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));

import { ManualPriceProvider } from "../providers/manual-provider";
import type { MarketAsset } from "../types";

function makeAsset(overrides: Partial<MarketAsset> = {}): MarketAsset {
  return {
    id: "ast-001",
    code: "600519",
    type: "A_SHARE" as any,
    currency: "CNY",
    ...overrides,
  };
}

describe("ManualPriceProvider", () => {
  beforeEach(() => {
    mockPrisma.priceSnapshot.findFirst.mockReset();
    mockPrisma.priceSnapshot.findFirst.mockResolvedValue(null);
  });

  it("isEnabled returns true", () => {
    const provider = new ManualPriceProvider();
    expect(provider.isEnabled()).toBe(true);
  });

  it("name is 'manual'", () => {
    const provider = new ManualPriceProvider();
    expect(provider.name).toBe("manual");
  });

  it("returns today MANUAL price when available", async () => {
    const mockPrice = { toNumber: () => 42.5 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    mockPrisma.priceSnapshot.findFirst.mockResolvedValueOnce({
      price: mockPrice,
      currency: "CNY",
      date: today,
    });

    const provider = new ManualPriceProvider();
    const result = await provider.getLatestPrice(makeAsset());
    expect(result.price).toBe(42.5);
    expect(result.currency).toBe("CNY");
    expect(result.source).toBe("manual");

    // Verify the query was for today's MANUAL source
    expect(mockPrisma.priceSnapshot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: "MANUAL",
        }),
      }),
    );
  });

  it("falls back to most recent price when no MANUAL price today", async () => {
    const mockPrice = { toNumber: () => 35.0 };
    const pastDate = new Date("2026-05-08");

    mockPrisma.priceSnapshot.findFirst
      .mockResolvedValueOnce(null)   // 1st call: no MANUAL today
      .mockResolvedValueOnce({       // 2nd call: latest price
        price: mockPrice,
        currency: "CNY",
        date: pastDate,
      });

    const provider = new ManualPriceProvider();
    const result = await provider.getLatestPrice(makeAsset());
    expect(result.price).toBe(35.0);
    expect(result.priceDate).toBe("2026-05-08");
  });

  it("returns 1 for CASH when no prices at all", async () => {
    // Default mock returns null for both calls
    const provider = new ManualPriceProvider();
    const cashAsset = makeAsset({ id: "cash-001", type: "CASH" as any });
    const result = await provider.getLatestPrice(cashAsset);
    expect(result.price).toBe(1);
    expect(result.currency).toBe("CNY");
  });

  it("returns 0 for non-cash when no prices at all", async () => {
    const provider = new ManualPriceProvider();
    const result = await provider.getLatestPrice(makeAsset());
    expect(result.price).toBe(0);
  });

  it("uses asset currency as fallback when no price found", async () => {
    const provider = new ManualPriceProvider();
    const asset = makeAsset({ currency: "USD" });
    const result = await provider.getLatestPrice(asset);
    expect(result.currency).toBe("USD");
  });

  it("healthCheck returns HEALTHY", async () => {
    const provider = new ManualPriceProvider();
    const health = await provider.healthCheck();
    expect(health.status).toBe("HEALTHY");
    expect(health.checkedAt).toBeDefined();
  });
});
