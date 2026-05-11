import type { OcrRowResult } from "./types";

/** 去除货币符号、逗号、空格，返回纯数字字符串或空 */
export function normalizeAmount(raw: string | undefined): string {
  if (!raw) return "";
  let s = raw.trim();
  // 去掉人民币符号、美元符号
  s = s.replace(/[¥￥$]/g, "");
  // 去掉千分位逗号
  s = s.replace(/,/g, "");
  // 去掉多余空格
  s = s.replace(/\s/g, "");
  // 百分号保留但不解析
  if (s.endsWith("%")) s = s.slice(0, -1);
  // 验证是否有效数字
  if (s === "" || s === "-" || s === ".") return "";
  if (!/^[+-]?[\d.]+$/.test(s)) return "";
  return s;
}

/** 标准化资产类型映射 */
export function normalizeAssetType(raw: string | undefined): string {
  if (!raw) return "";
  const t = raw.trim();
  const map: Record<string, string> = {
    "股票": "A_SHARE", "A股": "A_SHARE", "a股": "A_SHARE",
    "美股": "US_STOCK", "港股": "HK_STOCK",
    "基金": "MUTUAL_FUND", "场内基金": "ETF", "场外基金": "MUTUAL_FUND",
    "ETF": "ETF", "公募基金": "MUTUAL_FUND", "黄金": "GOLD_ACCUMULATION", "积存金": "GOLD_ACCUMULATION",
    "债券": "BOND", "债基": "BOND", "银行理财": "BANK_WEALTH", "理财": "BANK_WEALTH",
    "现金": "CASH", "货币基金": "CASH",
  };
  return map[t] ?? map[t.toLowerCase()] ?? t.toUpperCase();
}

/** 标准化来源平台 */
export function normalizePlatform(raw: string | undefined): string {
  if (!raw) return "";
  const t = raw.trim().toUpperCase();
  if (t.includes("支付宝") || t.includes("ALIPAY")) return "ALIPAY";
  if (t.includes("券商") || t.includes("华泰") || t.includes("BROKER")) return "BROKER";
  if (t.includes("银行") || t.includes("招商") || t.includes("工商") || t.includes("BANK")) return "BANK";
  return "OTHER";
}

/** 对 OCR 行结果做标准化处理 */
export function normalizeOcrRow(row: OcrRowResult): OcrRowResult {
  return {
    ...row,
    quantity: normalizeAmount(row.quantity),
    price: normalizeAmount(row.price),
    marketValue: normalizeAmount(row.marketValue),
    cost: normalizeAmount(row.cost),
    holdingReturn: normalizeAmount(row.holdingReturn),
    assetType: normalizeAssetType(row.assetType) || row.assetType,
  };
}
