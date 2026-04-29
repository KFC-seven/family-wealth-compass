import type { OcrRowResult } from "./types";

export interface RowValidationIssue {
  field: string;
  type: "MISSING" | "INVALID" | "LOW_CONFIDENCE" | "DUPLICATE";
  message: string;
}

export interface ValidatedRow {
  row: OcrRowResult;
  issues: RowValidationIssue[];
  action: "SAVE" | "IGNORE" | "MANUAL";
}

const CONFIDENCE_THRESHOLD = parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD ?? "0.8") * 100;

/** 校验单行 OCR 结果 */
export function validateRow(row: OcrRowResult, allRows: OcrRowResult[]): ValidatedRow {
  const issues: RowValidationIssue[] = [];

  if (!row.member?.trim()) issues.push({ field: "member", type: "MISSING", message: "成员不能为空" });
  if (!row.account?.trim()) issues.push({ field: "account", type: "MISSING", message: "账户不能为空" });
  if (!row.assetName?.trim()) issues.push({ field: "assetName", type: "MISSING", message: "资产名称不能为空" });
  if (!row.assetType?.trim()) issues.push({ field: "assetType", type: "MISSING", message: "资产类型不能为空" });

  if (row.marketValue && parseFloat(row.marketValue) < 0) {
    issues.push({ field: "marketValue", type: "INVALID", message: "市值不能为负数" });
  }
  if (row.quantity && parseFloat(row.quantity) < 0) {
    issues.push({ field: "quantity", type: "INVALID", message: "数量不能为负数" });
  }
  if (row.cost && parseFloat(row.cost) < 0) {
    issues.push({ field: "cost", type: "INVALID", message: "成本不能为负数" });
  }

  if (row.confidence < CONFIDENCE_THRESHOLD) {
    issues.push({ field: "confidence", type: "LOW_CONFIDENCE", message: `置信度 ${row.confidence}% 低于阈值 ${CONFIDENCE_THRESHOLD}%` });
  }

  // 简单去重：同一资产名+同一账户重复
  const dup = allRows.filter(
    (r) =>
      r !== row &&
      r.assetName?.trim() === row.assetName?.trim() &&
      r.account?.trim() === row.account?.trim(),
  );
  if (dup.length > 0) {
    issues.push({ field: "assetName", type: "DUPLICATE", message: "疑似重复行" });
  }

  const hasMissing = issues.some((i) => i.type === "MISSING");
  const hasInvalid = issues.some((i) => i.type === "INVALID");

  return {
    row,
    issues,
    action: hasInvalid ? "IGNORE" : hasMissing ? "MANUAL" : "SAVE",
  };
}

/** 批量校验 */
export function validateRows(rows: OcrRowResult[]): ValidatedRow[] {
  return rows.map((r) => validateRow(r, rows));
}
