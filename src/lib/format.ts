import { CURRENCY_SYMBOL } from "./constants";

export function formatMoney(value: number, currency = "CNY"): string {
  const symbol = currency === "CNY" ? CURRENCY_SYMBOL : "$";
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

export function formatCompactMoney(value: number, currency = "CNY"): string {
  const symbol = currency === "CNY" ? CURRENCY_SYMBOL : "$";
  const absValue = Math.abs(value);
  const suffix = value < 0 ? "-" : "";
  if (absValue >= 1_0000_0000) {
    return `${suffix}${symbol}${(absValue / 1_0000_0000).toFixed(2)}亿`;
  }
  if (absValue >= 1_0000) {
    return `${suffix}${symbol}${(absValue / 1_0000).toFixed(1)}万`;
  }
  return `${suffix}${symbol}${absValue.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatSignedMoney(value: number, currency = "CNY"): string {
  const symbol = currency === "CNY" ? CURRENCY_SYMBOL : "$";
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  const formatted = Math.abs(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${prefix}${symbol}${formatted}`;
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "--";
  const prefix = value > 0 ? "+" : "";
  const pct = value * 100;
  return `${prefix}${pct.toFixed(2)}%`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}月${d}日`;
}

export function formatMonth(monthStr: string): string {
  const [, m] = monthStr.split("-");
  return `${parseInt(m)}月`;
}

export function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}年${m}月${d}日`;
}
