import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { SinaFinanceProvider } from "../providers/sina-finance-provider";
import { ProviderUnavailableError, ProviderDataError } from "../errors";
import type { MarketAsset } from "../types";

function mockFetchResponse(body: string, ok = true) {
  return {
    ok,
    text: () => Promise.resolve(body),
  };
}

/**
 * Build a mock Sina CSV response for the given symbol and price.
 * A-share format: fields[3] = current price
 * US stock format: fields[1] = current price
 */
function makeSinaCSV(symbol: string, price: number): string {
  if (symbol.startsWith("gb_")) {
    // US stock format: name,price,...
    return `var hq_str_${symbol}="NAME,${price},100,200,300,400,500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900,2000,2100,2200,2300,2400,2500,2600,2700,2800,2900,3000";`;
  }
  // A-share format: name,open,prevClose,currentPrice,high,low,...
  return `var hq_str_${symbol}="NAME,42.0,42.2,${price},42.8,41.9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0";`;
}

function makeAsset(overrides: Partial<MarketAsset> = {}): MarketAsset {
  return {
    id: "ast-001",
    code: "600519",
    type: "A_SHARE" as any,
    currency: "CNY",
    ...overrides,
  };
}

describe("SinaFinanceProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.MARKET_DATA_ENABLE_SINA_FINANCE;
  });

  describe("when disabled (default)", () => {
    it("isEnabled returns false by default", () => {
      const provider = new SinaFinanceProvider();
      expect(provider.isEnabled()).toBe(false);
    });

    it("getLatestPrice throws ProviderUnavailableError when disabled", async () => {
      const provider = new SinaFinanceProvider();
      await expect(
        provider.getLatestPrice(makeAsset()),
      ).rejects.toThrow(ProviderUnavailableError);
    });

    it("name is 'sina-finance'", () => {
      const provider = new SinaFinanceProvider();
      expect(provider.name).toBe("sina-finance");
    });

    it("healthCheck returns DISABLED when not configured", async () => {
      const provider = new SinaFinanceProvider();
      const health = await provider.healthCheck();
      expect(health.status).toBe("DISABLED");
    });
  });

  describe("when enabled", () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      process.env.MARKET_DATA_ENABLE_SINA_FINANCE = "true";
      mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);
    });

    describe("symbol construction", () => {
      it("US stock (non-numeric code) builds gb_ prefix", async () => {
        mockFetch.mockResolvedValue(
          mockFetchResponse(makeSinaCSV("gb_aapl", 198.5)),
        );

        const provider = new SinaFinanceProvider();
        const asset = makeAsset({ code: "AAPL", type: "US_STOCK" as any });
        const result = await provider.getLatestPrice(asset);
        expect(result.price).toBe(198.5);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("gb_aapl"),
          expect.any(Object),
        );
      });

      it("60xxxx code uses sh prefix", async () => {
        mockFetch.mockResolvedValue(
          mockFetchResponse(makeSinaCSV("sh600519", 180.5)),
        );

        const provider = new SinaFinanceProvider();
        const asset = makeAsset({ code: "600519" });
        await provider.getLatestPrice(asset);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("sh600519"),
          expect.any(Object),
        );
      });

      it("00xxxx code uses sz prefix", async () => {
        mockFetch.mockResolvedValue(
          mockFetchResponse(makeSinaCSV("sz000001", 15.3)),
        );

        const provider = new SinaFinanceProvider();
        const asset = makeAsset({ code: "000001" });
        await provider.getLatestPrice(asset);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("sz000001"),
          expect.any(Object),
        );
      });

      it("30xxxx code uses sz prefix", async () => {
        mockFetch.mockResolvedValue(
          mockFetchResponse(makeSinaCSV("sz300750", 220.0)),
        );

        const provider = new SinaFinanceProvider();
        const asset = makeAsset({ code: "300750" });
        await provider.getLatestPrice(asset);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("sz300750"),
          expect.any(Object),
        );
      });

      it("68xxxx code uses sh prefix", async () => {
        mockFetch.mockResolvedValue(
          mockFetchResponse(makeSinaCSV("sh688001", 55.5)),
        );

        const provider = new SinaFinanceProvider();
        const asset = makeAsset({ code: "688001" });
        await provider.getLatestPrice(asset);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("sh688001"),
          expect.any(Object),
        );
      });

      it("5xxxxx code uses sh prefix (ETF)", async () => {
        mockFetch.mockResolvedValue(
          mockFetchResponse(makeSinaCSV("sh510300", 3.85)),
        );

        const provider = new SinaFinanceProvider();
        const asset = makeAsset({ code: "510300", type: "ETF" as any });
        await provider.getLatestPrice(asset);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("sh510300"),
          expect.any(Object),
        );
      });
    });

    describe("error handling", () => {
      it("throws ProviderDataError for empty code", async () => {
        const provider = new SinaFinanceProvider();
        await expect(
          provider.getLatestPrice(makeAsset({ code: "" })),
        ).rejects.toThrow(ProviderDataError);
      });

      it("throws ProviderUnavailableError for HTTP error response", async () => {
        mockFetch.mockResolvedValue(mockFetchResponse("error", false));

        const provider = new SinaFinanceProvider();
        await expect(
          provider.getLatestPrice(makeAsset()),
        ).rejects.toThrow(ProviderUnavailableError);
      });

      it("throws ProviderDataError for malformed response", async () => {
        mockFetch.mockResolvedValue(
          mockFetchResponse("not a valid sina response"),
        );

        const provider = new SinaFinanceProvider();
        await expect(
          provider.getLatestPrice(makeAsset()),
        ).rejects.toThrow(ProviderDataError);
      });

      it("throws ProviderDataError for response with unparseable price", async () => {
        // Valid format but price field is empty/missing
        mockFetch.mockResolvedValue(
          mockFetchResponse('var hq_str_sh600519="NAME,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,";'),
        );

        const provider = new SinaFinanceProvider();
        await expect(
          provider.getLatestPrice(makeAsset()),
        ).rejects.toThrow(ProviderDataError);
      });

      it("throws ProviderUnavailableError on network failure", async () => {
        mockFetch.mockRejectedValue(new Error("Network failure"));

        const provider = new SinaFinanceProvider();
        await expect(
          provider.getLatestPrice(makeAsset()),
        ).rejects.toThrow(ProviderUnavailableError);
      });
    });

    describe("successful responses", () => {
      it("returns correct price for A-share", async () => {
        mockFetch.mockResolvedValue(
          mockFetchResponse(makeSinaCSV("sh600519", 185.6)),
        );

        const provider = new SinaFinanceProvider();
        const result = await provider.getLatestPrice(makeAsset());
        expect(result.price).toBe(185.6);
        expect(result.source).toBe("sina");
        expect(result.confidence).toBe(0.85);
        expect(result.currency).toBe("CNY");
      });

      it("returns USD currency for US stocks when currency not explicitly set", async () => {
        mockFetch.mockResolvedValue(
          mockFetchResponse(makeSinaCSV("gb_aapl", 198.5)),
        );

        const provider = new SinaFinanceProvider();
        const asset = makeAsset({ code: "AAPL", type: "US_STOCK" as any, currency: undefined });
        const result = await provider.getLatestPrice(asset);
        expect(result.currency).toBe("USD");
      });
    });

    describe("healthCheck", () => {
      it("returns HEALTHY with valid response", async () => {
        mockFetch.mockResolvedValue(
          mockFetchResponse(makeSinaCSV("sh600519", 1900.0)),
        );

        const provider = new SinaFinanceProvider();
        const health = await provider.healthCheck();
        expect(health.status).toBe("HEALTHY");
        expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      });

      it("returns DEGRADED when price parse fails", async () => {
        mockFetch.mockResolvedValue(
          mockFetchResponse("var hq_str_sh600519=\"INVALID,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,\";"),
        );

        const provider = new SinaFinanceProvider();
        const health = await provider.healthCheck();
        expect(health.status).toBe("DEGRADED");
      });

      it("returns DEGRADED on HTTP error", async () => {
        mockFetch.mockResolvedValue(mockFetchResponse("error", false));

        const provider = new SinaFinanceProvider();
        const health = await provider.healthCheck();
        expect(health.status).toBe("DEGRADED");
      });

      it("returns FAILED on network error", async () => {
        mockFetch.mockRejectedValue(new Error("timeout"));

        const provider = new SinaFinanceProvider();
        const health = await provider.healthCheck();
        expect(health.status).toBe("FAILED");
      });
    });
  });
});
