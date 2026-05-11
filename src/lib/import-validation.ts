import { RecognizedAssetRow, ImportValidationIssue, ImportSummary, ImportSaveMode, ImportSource, RecognitionRowStatus } from "@/types/import";
import { formatAssetType } from "@/types/finance";
import { IMPORT_SOURCE_LABELS } from "@/types/import";

export function validateRecognizedRows(rows: RecognizedAssetRow[]): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];
  const seen: Set<string> = new Set();

  for (const row of rows) {
    const f = row.fields;

    // Required fields check
    if (!f.member.value.trim()) {
      issues.push({ rowId: row.id, field: "member", type: "error", message: "成员不能为空" });
    }
    if (!f.account.value.trim()) {
      issues.push({ rowId: row.id, field: "account", type: "error", message: "账户不能为空" });
    }
    if (!f.assetName.value.trim()) {
      issues.push({ rowId: row.id, field: "assetName", type: "error", message: "资产名称不能为空" });
    }
    if (!f.assetType.value.trim()) {
      issues.push({ rowId: row.id, field: "assetType", type: "error", message: "资产类型不能为空" });
    }

    // Numeric field validation
    const qty = parseFloat(f.quantity.value);
    if (f.quantity.value && isNaN(qty)) {
      issues.push({ rowId: row.id, field: "quantity", type: "error", message: "数量格式无效" });
    } else if (qty < 0) {
      issues.push({ rowId: row.id, field: "quantity", type: "error", message: "数量不能为负数" });
    }

    const mktVal = parseFloat(f.marketValue.value);
    if (f.marketValue.value && isNaN(mktVal)) {
      issues.push({ rowId: row.id, field: "marketValue", type: "error", message: "市值格式无效" });
    } else if (mktVal < 0) {
      issues.push({ rowId: row.id, field: "marketValue", type: "error", message: "市值不能为负数" });
    }

    const cost = parseFloat(f.cost.value);
    if (f.cost.value && cost < 0) {
      issues.push({ rowId: row.id, field: "cost", type: "error", message: "成本不能为负数" });
    }

    // Holding return rate check
    const rateStr = f.holdingReturnRate.value.replace("%", "");
    const rate = parseFloat(rateStr);
    if (rateStr && !isNaN(rate) && Math.abs(rate) > 100) {
      issues.push({ rowId: row.id, field: "holdingReturnRate", type: "warning", message: `持仓收益率 ${rate}% 超过正负100%，请确认` });
    }

    // Confidence check
    const lowConfFields = Object.entries(f).filter(([_, v]) => v.confidence < 80 && v.value.trim());
    for (const [fieldName] of lowConfFields) {
      issues.push({ rowId: row.id, field: fieldName, type: "warning", message: `"${fieldName}" 识别置信度较低 (${f[fieldName as keyof typeof f].confidence}%)` });
    }

    // Duplicate check
    const key = `${f.member.value}|${f.account.value}|${f.assetName.value}`;
    if (key.replace(/\|/g, "").trim()) {
      if (seen.has(key)) {
        issues.push({ rowId: row.id, field: "assetName", type: "warning", message: "疑似与另一行重复（相同成员+账户+资产）" });
      }
      seen.add(key);
    }
  }

  return issues;
}

export function getConfidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 90) return "high";
  if (confidence >= 70) return "medium";
  return "low";
}

export function calculateImportSummary(
  rows: RecognizedAssetRow[],
  saveMode: ImportSaveMode
): ImportSummary {
  const activeRows = rows.filter((r) => r.userAction !== "ignore");
  const totalMarketValue = activeRows.reduce((s, r) => {
    const v = parseFloat(r.fields.marketValue.value);
    return s + (isNaN(v) ? 0 : v);
  }, 0);

  const members = new Set<string>();
  const accounts = new Set<string>();
  const assetTypes = new Set<string>();

  for (const row of activeRows) {
    if (row.fields.member.value.trim()) members.add(row.fields.member.value.trim());
    if (row.fields.account.value.trim()) accounts.add(row.fields.account.value.trim());
    if (row.fields.assetType.value.trim()) {
      const label = formatAssetType(row.fields.assetType.value);
      assetTypes.add(label || row.fields.assetType.value);
    }
  }

  return {
    totalRows: rows.length,
    ignoredRows: rows.filter((r) => r.userAction === "ignore").length,
    lowConfidenceRows: rows.filter((r) => r.status === "low_confidence").length,
    missingFieldRows: rows.filter((r) => r.status === "missing_field").length,
    duplicateRows: rows.filter((r) => r.status === "duplicate").length,
    totalMarketValue,
    members: Array.from(members),
    accounts: Array.from(accounts),
    assetTypes: Array.from(assetTypes),
    saveMode,
  };
}

export function detectDuplicateRecognizedRows(
  rows: RecognizedAssetRow[]
): string[] {
  const seen = new Map<string, number>();
  const duplicates: string[] = [];
  for (const row of rows) {
    const key = `${row.fields.member.value}|${row.fields.account.value}|${row.fields.assetName.value}`;
    if (key.replace(/\|/g, "").trim()) {
      const count = seen.get(key) || 0;
      if (count > 0) duplicates.push(row.id);
      seen.set(key, count + 1);
    }
  }
  return duplicates;
}

export function normalizeRecognizedAmount(value: string): number {
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function mapRecognizedAssetTypeLabel(typeValue: string): string {
  return formatAssetType(typeValue);
}

export function mapImportSourceLabel(source: ImportSource): string {
  return IMPORT_SOURCE_LABELS[source] || source;
}

export function mapRecognitionStatusLabel(status: RecognitionRowStatus): string {
  const labels: Record<RecognitionRowStatus, string> = {
    normal: "正常",
    low_confidence: "低置信度",
    missing_field: "缺失字段",
    duplicate: "疑似重复",
    pending_confirm: "待确认",
  };
  return labels[status] || status;
}
