// Map DB enum to frontend asset type string
export function mapAssetTypeToFrontend(type: string): string {
  const map: Record<string, string> = {
    CASH: "cash",
    A_SHARE: "aShare",
    US_STOCK: "usStock",
    ETF: "etf",
    MUTUAL_FUND: "mutualFund",
    BANK_WEALTH: "bankWealth",
    GOLD_ACCUMULATION: "gold",
    BOND: "cash",
    OTHER: "cash",
  };
  return map[type] || "cash";
}

// Map frontend asset type to DB enum
export function mapFrontendToAssetType(type: string): string {
  const map: Record<string, string> = {
    cash: "CASH",
    aShare: "A_SHARE",
    usStock: "US_STOCK",
    etf: "ETF",
    mutualFund: "MUTUAL_FUND",
    bankWealth: "BANK_WEALTH",
    gold: "GOLD_ACCUMULATION",
  };
  return map[type] || "OTHER";
}

// Convert Prisma Decimal to number for frontend
export function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof (value as Record<string, unknown>).toNumber === "function") return ((value as Record<string, unknown>).toNumber as () => number)();
  return Number(value);
}

// Date to ISO string for API response
export function dateToISO(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString();
}
