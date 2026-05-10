import { describe, it, expect } from "vitest";
import {
  validateRecognizedRows,
  getConfidenceLevel,
  calculateImportSummary,
  detectDuplicateRecognizedRows,
  normalizeRecognizedAmount,
  mapRecognizedAssetTypeLabel,
  mapImportSourceLabel,
  mapRecognitionStatusLabel,
} from "../import-validation";

function makeField(value: string, confidence = 100) {
  return { value, confidence, editable: true };
}

function makeRow(id: string, overrides: Record<string, string> = {}): any {
  return {
    id,
    source: "alipay",
    fields: {
      member: makeField(overrides.member ?? "爸爸"),
      account: makeField(overrides.account ?? "支付宝账户"),
      assetName: makeField(overrides.assetName ?? "沪深300"),
      assetCode: makeField(overrides.assetCode ?? "110020"),
      assetType: makeField(overrides.assetType ?? "MUTUAL_FUND"),
      currency: makeField("CNY"),
      market: makeField(""),
      quantity: makeField(overrides.quantity ?? "1000"),
      price: makeField(overrides.price ?? "1.5"),
      marketValue: makeField(overrides.marketValue ?? "1500"),
      cost: makeField(overrides.cost ?? "1400"),
      holdingReturn: makeField(overrides.holdingReturn ?? "100"),
      holdingReturnRate: makeField(overrides.holdingReturnRate ?? "7.14"),
      cashBalance: makeField(""),
      dataDate: makeField("2026-05-11"),
      note: makeField(""),
      transactionType: makeField("BUY"),
      tradeDate: makeField("2026-05-11"),
      grossAmount: makeField(""),
      fee: makeField(""),
      tax: makeField(""),
      netAmount: makeField(""),
      cashImpact: makeField(""),
      realizedReturn: makeField(""),
    },
    status: "normal",
    issues: [],
    userAction: "save",
  };
}

describe("validateRecognizedRows", () => {
  it("returns no issues for valid rows", () => {
    const issues = validateRecognizedRows([makeRow("r1")]);
    expect(issues).toHaveLength(0);
  });

  it("reports error for missing member", () => {
    const row = makeRow("r1", { member: "" });
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "member", type: "error" }),
    );
  });

  it("reports error for missing account", () => {
    const row = makeRow("r1", { account: "" });
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "account", type: "error" }),
    );
  });

  it("reports error for missing assetName", () => {
    const row = makeRow("r1", { assetName: "" });
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "assetName", type: "error" }),
    );
  });

  it("reports error for missing assetType", () => {
    const row = makeRow("r1", { assetType: "" });
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "assetType", type: "error" }),
    );
  });

  it("reports error for invalid quantity format", () => {
    const row = makeRow("r1", { quantity: "abc" });
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "quantity", type: "error", message: "数量格式无效" }),
    );
  });

  it("reports error for negative quantity", () => {
    const row = makeRow("r1", { quantity: "-100" });
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "quantity", type: "error", message: "数量不能为负数" }),
    );
  });

  it("reports error for invalid marketValue format", () => {
    const row = makeRow("r1", { marketValue: "abc" });
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "marketValue", type: "error", message: "市值格式无效" }),
    );
  });

  it("reports error for negative marketValue", () => {
    const row = makeRow("r1", { marketValue: "-500" });
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "marketValue", type: "error" }),
    );
  });

  it("reports error for negative cost", () => {
    const row = makeRow("r1", { cost: "-100" });
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "cost", type: "error", message: "成本不能为负数" }),
    );
  });

  it("reports warning for holdingReturnRate > 100%", () => {
    const row = makeRow("r1", { holdingReturnRate: "150" });
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "holdingReturnRate", type: "warning" }),
    );
  });

  it("reports warning for holdingReturnRate < -100%", () => {
    const row = makeRow("r1", { holdingReturnRate: "-150" });
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "holdingReturnRate", type: "warning" }),
    );
  });

  it("reports warning for low confidence fields", () => {
    const row = makeRow("r1");
    row.fields.assetName.confidence = 60;
    const issues = validateRecognizedRows([row]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "assetName", type: "warning" }),
    );
  });

  it("reports warning for duplicate rows", () => {
    const r1 = makeRow("r1", { member: "爸爸", account: "A", assetName: "某基金" });
    const r2 = makeRow("r2", { member: "爸爸", account: "A", assetName: "某基金" });
    const issues = validateRecognizedRows([r1, r2]);
    expect(issues).toContainEqual(
      expect.objectContaining({ field: "assetName", type: "warning" }),
    );
  });

  it("does not treat empty holdingReturnRate as a warning", () => {
    const row = makeRow("r1", { holdingReturnRate: "" });
    const issues = validateRecognizedRows([row]);
    expect(issues.filter((i) => i.field === "holdingReturnRate")).toHaveLength(0);
  });

  it("skips duplicate check when all key fields are empty", () => {
    const r1 = makeRow("r1", { member: "", account: "", assetName: "" });
    const r2 = makeRow("r2", { member: "", account: "", assetName: "" });
    const issues = validateRecognizedRows([r1, r2]);
    const dup = issues.filter((i) => i.type === "warning" && i.field === "assetName");
    expect(dup).toHaveLength(0);
  });
});

describe("getConfidenceLevel", () => {
  it('returns "high" for 95', () => {
    expect(getConfidenceLevel(95)).toBe("high");
  });
  it('returns "high" for 90', () => {
    expect(getConfidenceLevel(90)).toBe("high");
  });
  it('returns "medium" for 80', () => {
    expect(getConfidenceLevel(80)).toBe("medium");
  });
  it('returns "medium" for 70', () => {
    expect(getConfidenceLevel(70)).toBe("medium");
  });
  it('returns "low" for 50', () => {
    expect(getConfidenceLevel(50)).toBe("low");
  });
  it('returns "low" for 69', () => {
    expect(getConfidenceLevel(69)).toBe("low");
  });
  it("returns high for 100", () => {
    expect(getConfidenceLevel(100)).toBe("high");
  });
});

describe("calculateImportSummary", () => {
  it("returns correct stats for all active rows", () => {
    const rows = [makeRow("r1"), makeRow("r2")];
    rows[0].fields.marketValue = makeField("1000");
    rows[1].fields.marketValue = makeField("2000");
    const summary = calculateImportSummary(rows, "holding_snapshot");
    expect(summary.totalRows).toBe(2);
    expect(summary.ignoredRows).toBe(0);
    expect(summary.totalMarketValue).toBe(3000);
    expect(summary.saveMode).toBe("holding_snapshot");
  });

  it("counts ignored rows separately", () => {
    const rows = [makeRow("r1"), makeRow("r2")];
    rows[1].userAction = "ignore";
    const summary = calculateImportSummary(rows, "transaction");
    expect(summary.totalRows).toBe(2);
    expect(summary.ignoredRows).toBe(1);
  });

  it("deduplicates members and accounts", () => {
    const rows = [
      makeRow("r1", { member: "爸爸", account: "A", assetType: "aShare" }),
      makeRow("r2", { member: "爸爸", account: "A", assetType: "aShare" }),
      makeRow("r3", { member: "妈妈", account: "B", assetType: "mutualFund" }),
    ];
    const summary = calculateImportSummary(rows, "holding_snapshot");
    expect(summary.members).toEqual(["爸爸", "妈妈"]);
    expect(summary.accounts).toEqual(["A", "B"]);
  });

  it("handles empty rows gracefully", () => {
    const summary = calculateImportSummary([], "transaction");
    expect(summary.totalRows).toBe(0);
    expect(summary.totalMarketValue).toBe(0);
    expect(summary.members).toEqual([]);
    expect(summary.accounts).toEqual([]);
  });
});

describe("detectDuplicateRecognizedRows", () => {
  it("returns empty for non-duplicate rows", () => {
    const rows = [
      makeRow("r1", { member: "爸爸", account: "A", assetName: "基金1" }),
      makeRow("r2", { member: "妈妈", account: "B", assetName: "基金2" }),
    ];
    expect(detectDuplicateRecognizedRows(rows)).toEqual([]);
  });

  it("returns duplicate IDs for matching rows", () => {
    const rows = [
      makeRow("r1", { member: "爸爸", account: "A", assetName: "某基金" }),
      makeRow("r2", { member: "爸爸", account: "A", assetName: "某基金" }),
      makeRow("r3", { member: "妈妈", account: "B", assetName: "其他" }),
    ];
    const dups = detectDuplicateRecognizedRows(rows);
    expect(dups).toContain("r2");
    expect(dups).not.toContain("r1");
    expect(dups).not.toContain("r3");
  });

  it("returns empty for rows with empty key fields", () => {
    const rows = [makeRow("r1", { member: "", account: "", assetName: "" })];
    expect(detectDuplicateRecognizedRows(rows)).toEqual([]);
  });
});

describe("normalizeRecognizedAmount", () => {
  it('converts "¥1,234.56" to 1234.56', () => expect(normalizeRecognizedAmount("¥1,234.56")).toBe(1234.56));
  it('converts "abc" to 0', () => expect(normalizeRecognizedAmount("abc")).toBe(0));
  it('converts "$500" to 500', () => expect(normalizeRecognizedAmount("$500")).toBe(500));
  it('converts empty string to 0', () => expect(normalizeRecognizedAmount("")).toBe(0));
  it('converts "-100" to -100', () => expect(normalizeRecognizedAmount("-100")).toBe(-100));
  it('converts "12.34%" to 12.34', () => expect(normalizeRecognizedAmount("12.34%")).toBe(12.34));
});

describe("mapRecognizedAssetTypeLabel", () => {
  it('maps "aShare" to "A股"', () => expect(mapRecognizedAssetTypeLabel("aShare")).toBe("A股"));
  it('maps "mutualFund" to "场外基金"', () => expect(mapRecognizedAssetTypeLabel("mutualFund")).toBe("场外基金"));
  it("returns input for unknown type", () => expect(mapRecognizedAssetTypeLabel("UNKNOWN")).toBe("UNKNOWN"));
});

describe("mapImportSourceLabel", () => {
  it('maps "alipay" to "支付宝"', () => expect(mapImportSourceLabel("alipay")).toBe("支付宝"));
  it('maps "broker" to "券商 App"', () => expect(mapImportSourceLabel("broker")).toBe("券商 App"));
  it("returns input for unknown source", () => expect(mapImportSourceLabel("unknown" as any)).toBe("unknown"));
});

describe("mapRecognitionStatusLabel", () => {
  it('maps "normal" to "正常"', () => expect(mapRecognitionStatusLabel("normal")).toBe("正常"));
  it('maps "low_confidence" to "低置信度"', () => expect(mapRecognitionStatusLabel("low_confidence")).toBe("低置信度"));
  it('maps "missing_field" to "缺失字段"', () => expect(mapRecognitionStatusLabel("missing_field")).toBe("缺失字段"));
  it('maps "duplicate" to "疑似重复"', () => expect(mapRecognitionStatusLabel("duplicate")).toBe("疑似重复"));
  it('maps "pending_confirm" to "待确认"', () => expect(mapRecognitionStatusLabel("pending_confirm")).toBe("待确认"));
});
