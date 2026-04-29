import { PricePoint, TradeMarker } from "@/types/finance";

export function generatePriceHistory(
  startPrice: number,
  days: number,
  volatility: number = 0.015
): PricePoint[] {
  const points: PricePoint[] = [];
  let price = startPrice;
  const startDate = new Date("2025-02-01");

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const change = price * volatility * (Math.random() - 0.48);
    price = Math.max(price + change, startPrice * 0.5);
    points.push({
      date: date.toISOString().slice(0, 10),
      price: Math.round(price * 100) / 100,
    });
  }
  return points;
}

export const mockPriceHistory: Record<string, { prices: PricePoint[]; markers: TradeMarker[] }> = {
  // 贵州茅台 - 华泰证券
  "h-1": {
    prices: [
      { date: "2025-02-01", price: 1650 },
      { date: "2025-02-15", price: 1670 },
      { date: "2025-03-01", price: 1660 },
      { date: "2025-03-05", price: 1680 },
      { date: "2025-03-15", price: 1700 },
      { date: "2025-04-01", price: 1720 },
      { date: "2025-04-15", price: 1710 },
      { date: "2025-05-01", price: 1740 },
      { date: "2025-05-15", price: 1760 },
      { date: "2025-06-01", price: 1750 },
      { date: "2025-06-15", price: 1780 },
      { date: "2025-07-01", price: 1800 },
      { date: "2025-07-15", price: 1790 },
      { date: "2025-08-01", price: 1810 },
      { date: "2025-08-15", price: 1830 },
      { date: "2025-09-01", price: 1820 },
      { date: "2025-09-15", price: 1850 },
      { date: "2025-10-01", price: 1840 },
      { date: "2025-10-15", price: 1860 },
      { date: "2025-11-01", price: 1830 },
      { date: "2025-11-15", price: 1850 },
      { date: "2025-12-01", price: 1880 },
      { date: "2025-12-15", price: 1870 },
      { date: "2026-01-01", price: 1900 },
      { date: "2026-01-15", price: 1890 },
      { date: "2026-02-01", price: 1860 },
      { date: "2026-02-15", price: 1840 },
      { date: "2026-03-01", price: 1820 },
      { date: "2026-03-15", price: 1800 },
      { date: "2026-04-01", price: 1810 },
      { date: "2026-04-15", price: 1820 },
      { date: "2026-04-28", price: 1820 },
    ],
    markers: [
      { date: "2025-03-05", type: "BUY", quantity: 200, price: 1680, amount: 336000 },
    ],
  },
  // 易方达沪深300ETF联接A - partial sell
  "h-4": {
    prices: [
      { date: "2025-01-01", price: 1.42 },
      { date: "2025-01-15", price: 1.40 },
      { date: "2025-02-01", price: 1.43 },
      { date: "2025-02-15", price: 1.45 },
      { date: "2025-03-01", price: 1.48 },
      { date: "2025-03-15", price: 1.50 },
      { date: "2025-04-01", price: 1.52 },
      { date: "2025-04-15", price: 1.49 },
      { date: "2025-05-01", price: 1.51 },
      { date: "2025-05-15", price: 1.55 },
      { date: "2025-06-01", price: 1.58 },
      { date: "2025-06-15", price: 1.60 },
      { date: "2025-07-01", price: 1.62 },
      { date: "2025-07-15", price: 1.59 },
      { date: "2025-08-01", price: 1.61 },
      { date: "2025-08-15", price: 1.64 },
      { date: "2025-09-01", price: 1.66 },
      { date: "2025-09-15", price: 1.68 },
      { date: "2025-09-20", price: 1.65 },
      { date: "2025-10-01", price: 1.63 },
      { date: "2025-10-15", price: 1.60 },
      { date: "2025-11-01", price: 1.58 },
      { date: "2025-11-10", price: 1.58 },
      { date: "2025-11-15", price: 1.56 },
      { date: "2025-12-01", price: 1.54 },
      { date: "2025-12-15", price: 1.55 },
      { date: "2026-01-01", price: 1.57 },
      { date: "2026-01-15", price: 1.56 },
      { date: "2026-02-01", price: 1.54 },
      { date: "2026-03-01", price: 1.55 },
      { date: "2026-04-01", price: 1.56 },
      { date: "2026-04-28", price: 1.56 },
    ],
    markers: [
      { date: "2025-01-15", type: "BUY", quantity: 10000, price: 1.42, amount: 142000 },
      { date: "2025-06-30", type: "DIVIDEND", quantity: 0, price: 0, amount: 1560 },
      { date: "2025-09-20", type: "SELL", quantity: 2000, price: 1.65, amount: 3300 },
      { date: "2025-11-10", type: "SELL", quantity: 2000, price: 1.58, amount: 3160 },
    ],
  },
  // 宁德时代
  "h-3": {
    prices: [
      { date: "2025-02-01", price: 228 },
      { date: "2025-03-01", price: 232 },
      { date: "2025-04-01", price: 225 },
      { date: "2025-05-01", price: 230 },
      { date: "2025-06-01", price: 220 },
      { date: "2025-07-01", price: 218 },
      { date: "2025-08-01", price: 215 },
      { date: "2025-08-15", price: 212 },
      { date: "2025-09-01", price: 210 },
      { date: "2025-10-01", price: 205 },
      { date: "2025-11-01", price: 200 },
      { date: "2025-12-01", price: 198 },
      { date: "2026-01-01", price: 195 },
      { date: "2026-02-01", price: 192 },
      { date: "2026-03-01", price: 196 },
      { date: "2026-04-01", price: 198 },
      { date: "2026-04-28", price: 198.5 },
    ],
    markers: [
      { date: "2025-08-15", type: "BUY", quantity: 800, price: 212, amount: 169600 },
    ],
  },
  // 积存金
  "h-9": {
    prices: [
      { date: "2025-04-01", price: 452 },
      { date: "2025-04-15", price: 455 },
      { date: "2025-05-01", price: 458 },
      { date: "2025-05-15", price: 460 },
      { date: "2025-06-01", price: 462 },
      { date: "2025-06-15", price: 465 },
      { date: "2025-07-01", price: 460 },
      { date: "2025-07-15", price: 458 },
      { date: "2025-08-01", price: 465 },
      { date: "2025-08-15", price: 470 },
      { date: "2025-09-01", price: 468 },
      { date: "2025-10-01", price: 472 },
      { date: "2025-11-01", price: 475 },
      { date: "2025-12-01", price: 478 },
      { date: "2026-01-01", price: 480 },
      { date: "2026-02-01", price: 476 },
      { date: "2026-03-01", price: 475 },
      { date: "2026-04-01", price: 477 },
      { date: "2026-04-28", price: 478 },
    ],
    markers: [
      { date: "2025-04-03", type: "BUY", quantity: 200, price: 452, amount: 90400 },
      { date: "2025-07-15", type: "BUY", quantity: 150, price: 460, amount: 69000 },
      { date: "2025-10-20", type: "BUY", quantity: 150, price: 464, amount: 69600 },
    ],
  },
  // 华夏中证500ETF联接A
  "h-12": {
    prices: [
      { date: "2025-06-01", price: 0.85 },
      { date: "2025-06-15", price: 0.84 },
      { date: "2025-07-01", price: 0.86 },
      { date: "2025-07-15", price: 0.88 },
      { date: "2025-08-01", price: 0.87 },
      { date: "2025-08-15", price: 0.89 },
      { date: "2025-09-01", price: 0.86 },
      { date: "2025-10-01", price: 0.88 },
      { date: "2025-10-10", price: 0.88 },
      { date: "2025-11-01", price: 0.85 },
      { date: "2025-12-01", price: 0.82 },
      { date: "2026-01-01", price: 0.80 },
      { date: "2026-02-01", price: 0.78 },
      { date: "2026-03-01", price: 0.79 },
      { date: "2026-04-01", price: 0.795 },
      { date: "2026-04-28", price: 0.795 },
    ],
    markers: [
      { date: "2025-06-15", type: "BUY", quantity: 10000, price: 0.85, amount: 8500 },
      { date: "2025-10-10", type: "SELL", quantity: 2000, price: 0.88, amount: 1760 },
      { date: "2025-12-15", type: "DIVIDEND", quantity: 0, price: 0, amount: 120 },
    ],
  },
  // Apple Inc.
  "h-2": {
    prices: [
      { date: "2025-06-01", price: 175 },
      { date: "2025-06-15", price: 178 },
      { date: "2025-07-01", price: 180 },
      { date: "2025-08-01", price: 182 },
      { date: "2025-09-01", price: 185 },
      { date: "2025-10-01", price: 190 },
      { date: "2025-11-01", price: 188 },
      { date: "2025-12-01", price: 192 },
      { date: "2026-01-01", price: 195 },
      { date: "2026-02-01", price: 196 },
      { date: "2026-03-01", price: 198 },
      { date: "2026-04-01", price: 197 },
      { date: "2026-04-28", price: 198 },
    ],
    markers: [
      { date: "2025-06-10", type: "BUY", quantity: 50, price: 175, amount: 8750 },
    ],
  },
  // 招商银行理财产品
  "h-6": {
    prices: [
      { date: "2025-02-01", price: 150000 },
      { date: "2025-04-01", price: 150480 },
      { date: "2025-06-01", price: 151200 },
      { date: "2025-08-01", price: 152000 },
      { date: "2025-10-01", price: 152800 },
      { date: "2025-12-01", price: 153000 },
      { date: "2026-02-01", price: 153200 },
      { date: "2026-04-01", price: 153600 },
    ],
    markers: [
      { date: "2025-02-05", type: "BUY", quantity: 1, price: 150000, amount: 150000 },
    ],
  },
  // 工商银行添利宝
  "h-8": {
    prices: [
      { date: "2025-01-08", price: 280000 },
      { date: "2025-03-01", price: 281280 },
      { date: "2025-05-01", price: 282800 },
      { date: "2025-07-01", price: 284500 },
      { date: "2025-09-01", price: 286200 },
      { date: "2025-11-01", price: 288000 },
      { date: "2026-01-01", price: 289500 },
      { date: "2026-03-01", price: 291000 },
      { date: "2026-04-28", price: 291200 },
    ],
    markers: [
      { date: "2025-01-08", type: "BUY", quantity: 1, price: 280000, amount: 280000 },
    ],
  },
  // 博时黄金ETF联接A
  "h-10": {
    prices: [
      { date: "2025-05-10", price: 1.12 },
      { date: "2025-06-01", price: 1.14 },
      { date: "2025-07-01", price: 1.16 },
      { date: "2025-08-01", price: 1.18 },
      { date: "2025-09-01", price: 1.20 },
      { date: "2025-10-01", price: 1.21 },
      { date: "2025-11-01", price: 1.19 },
      { date: "2025-12-01", price: 1.20 },
      { date: "2026-01-01", price: 1.22 },
      { date: "2026-02-01", price: 1.20 },
      { date: "2026-03-01", price: 1.21 },
      { date: "2026-04-28", price: 1.21 },
    ],
    markers: [
      { date: "2025-05-10", type: "BUY", quantity: 3000, price: 1.12, amount: 3360 },
      { date: "2025-08-15", type: "DIVIDEND", quantity: 0, price: 0, amount: 320 },
    ],
  },
  // 中欧医疗健康混合A（已清仓）
  "h-15": {
    prices: [
      { date: "2025-02-10", price: 1.25 },
      { date: "2025-04-01", price: 1.18 },
      { date: "2025-06-01", price: 1.12 },
      { date: "2025-08-01", price: 1.05 },
      { date: "2025-10-01", price: 0.98 },
      { date: "2025-11-20", price: 0.95 },
    ],
    markers: [
      { date: "2025-02-10", type: "BUY", quantity: 5000, price: 1.25, amount: 6250 },
      { date: "2025-11-20", type: "SELL", quantity: 5000, price: 0.95, amount: 4750 },
    ],
  },
  // Apple
  "apple": {
    prices: [
      { date: "2025-01-01", price: 165 },
      { date: "2025-02-01", price: 168 },
      { date: "2025-03-01", price: 172 },
      { date: "2025-04-01", price: 170 },
      { date: "2025-05-01", price: 175 },
      { date: "2025-06-01", price: 178 },
      { date: "2025-07-01", price: 182 },
      { date: "2025-08-01", price: 185 },
      { date: "2025-09-01", price: 188 },
      { date: "2025-10-01", price: 192 },
      { date: "2025-11-01", price: 190 },
      { date: "2025-12-01", price: 195 },
      { date: "2026-01-01", price: 198 },
      { date: "2026-02-01", price: 196 },
      { date: "2026-03-01", price: 200 },
      { date: "2026-04-01", price: 198 },
      { date: "2026-04-28", price: 198 },
    ],
    markers: [
      { date: "2025-06-10", type: "BUY", quantity: 50, price: 175, amount: 8750 },
    ],
  },
};
