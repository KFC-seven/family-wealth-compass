import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateRow, validateRows } from "../validation";
import type { OcrRowResult } from "../types";

describe("validateRow", () => {
  function makeRow(overrides: Partial<OcrRowResult> = {}): OcrRowResult {
    return {
      member: "爸爸",
      account: "账户",
      assetName: "某基金",
      assetType: "MUTUAL_FUND",
      marketValue: "10000",
      rawText: "test",
      confidence: 90,
      ...overrides,
    };
  }

  it("returns SAVE action with no issues for a complete valid row", () => {
    const row = makeRow();
    const result = validateRow(row, [row]);
    expect(result.action).toBe("SAVE");
    expect(result.issues).toHaveLength(0);
  });

  it("returns MANUAL action with MISSING issue when member is missing", () => {
    const row = makeRow({ member: "" });
    const result = validateRow(row, [row]);
    expect(result.action).toBe("MANUAL");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "member", type: "MISSING" }),
    );
  });

  it("adds MISSING issue for empty account", () => {
    const row = makeRow({ account: "" });
    const result = validateRow(row, [row]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "account", type: "MISSING" }),
    );
  });

  it("adds MISSING issue for empty assetName", () => {
    const row = makeRow({ assetName: "" });
    const result = validateRow(row, [row]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "assetName", type: "MISSING" }),
    );
  });

  it("adds MISSING issue for empty assetType", () => {
    const row = makeRow({ assetType: "" });
    const result = validateRow(row, [row]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "assetType", type: "MISSING" }),
    );
  });

  it("returns IGNORE action with INVALID issue for negative marketValue", () => {
    const row = makeRow({ marketValue: "-100" });
    const result = validateRow(row, [row]);
    expect(result.action).toBe("IGNORE");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "marketValue", type: "INVALID" }),
    );
  });

  it("adds INVALID for negative quantity", () => {
    const row = makeRow({ quantity: "-50" });
    const result = validateRow(row, [row]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "quantity", type: "INVALID" }),
    );
  });

  it("adds INVALID for negative cost", () => {
    const row = makeRow({ cost: "-200" });
    const result = validateRow(row, [row]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "cost", type: "INVALID" }),
    );
  });

  it("adds LOW_CONFIDENCE issue when confidence below threshold", () => {
    const row = makeRow({ confidence: 50 });
    const result = validateRow(row, [row]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ type: "LOW_CONFIDENCE" }),
    );
  });

  it("adds DUPLICATE issue when same assetName+account appears twice", () => {
    const row1 = makeRow({ member: "爸爸", account: "账户", assetName: "某基金" });
    const row2 = makeRow({ member: "爸爸", account: "账户", assetName: "某基金" });
    const result = validateRow(row2, [row1, row2]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "assetName", type: "DUPLICATE" }),
    );
  });

  it("detects all missing fields when row is empty", () => {
    const row = makeRow({ member: "", account: "", assetName: "", assetType: "", confidence: 0 });
    const result = validateRow(row, [row]);
    const missingIssues = result.issues.filter((i) => i.type === "MISSING");
    expect(missingIssues).toHaveLength(4);
    expect(result.action).toBe("MANUAL");
  });

  it("does not add DUPLICATE when allRows has only one entry", () => {
    const row = makeRow();
    const result = validateRow(row, [row]);
    expect(result.issues.some((i) => i.type === "DUPLICATE")).toBe(false);
  });

  it("does not add DUPLICATE when names differ", () => {
    const row1 = makeRow({ assetName: "基金A" });
    const row2 = makeRow({ assetName: "基金B" });
    const result = validateRow(row2, [row1, row2]);
    expect(result.issues.some((i) => i.type === "DUPLICATE")).toBe(false);
  });

  it("honors CONFIDENCE_THRESHOLD from env var", async () => {
    vi.resetModules();
    process.env.OCR_CONFIDENCE_THRESHOLD = "0.95";
    const { validateRow: vr } = await import("../validation");
    const row = makeRow({ confidence: 90 });
    const result = vr(row, [row]);
    expect(result.issues.some((i) => i.type === "LOW_CONFIDENCE")).toBe(true);
  });

  it("accepts high confidence when above threshold", async () => {
    vi.resetModules();
    process.env.OCR_CONFIDENCE_THRESHOLD = "0.7";
    const { validateRow: vr } = await import("../validation");
    const row = makeRow({ confidence: 75 });
    const result = vr(row, [row]);
    expect(result.issues.some((i) => i.type === "LOW_CONFIDENCE")).toBe(false);
  });

  it("zero marketValue is valid (not negative)", () => {
    const row = makeRow({ marketValue: "0" });
    const result = validateRow(row, [row]);
    expect(result.issues.some((i) => i.field === "marketValue" && i.type === "INVALID")).toBe(false);
    expect(result.action).toBe("SAVE");
  });
});

describe("validateRows", () => {
  it("returns empty array for empty input", () => {
    expect(validateRows([])).toEqual([]);
  });

  it("validates multiple rows independently", () => {
    const rows: OcrRowResult[] = [
      {
        member: "爸爸",
        account: "账户",
        assetName: "基金A",
        assetType: "MUTUAL_FUND",
        marketValue: "10000",
        rawText: "test",
        confidence: 90,
      },
      {
        member: "",
        account: "",
        assetName: "",
        assetType: "",
        rawText: "",
        confidence: 0,
      },
    ];
    const results = validateRows(rows);
    expect(results).toHaveLength(2);
    expect(results[0].action).toBe("SAVE");
    expect(results[1].action).toBe("MANUAL");
  });
});
