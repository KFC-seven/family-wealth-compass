import { describe, it, expect } from "vitest";
import { emptyImportFields } from "../import-helpers";

describe("emptyImportFields", () => {
  it("returns all expected field keys", () => {
    const fields = emptyImportFields();
    const expectedKeys = [
      "member", "account", "assetName", "assetCode", "assetType",
      "currency", "market", "quantity", "price", "marketValue",
      "cost", "holdingReturn", "holdingReturnRate", "cashBalance",
      "dataDate", "note", "transactionType", "tradeDate",
      "grossAmount", "fee", "tax", "netAmount", "cashImpact", "realizedReturn",
    ];
    expect(Object.keys(fields).sort()).toEqual([...expectedKeys].sort());
  });

  it("sets default currency to CNY", () => {
    const fields = emptyImportFields();
    expect(fields.currency.value).toBe("CNY");
  });

  it("sets default transactionType to BUY", () => {
    const fields = emptyImportFields();
    expect(fields.transactionType.value).toBe("BUY");
  });

  it("sets dataDate to today", () => {
    const fields = emptyImportFields();
    const today = new Date().toISOString().slice(0, 10);
    expect(fields.dataDate.value).toBe(today);
  });

  it("sets tradeDate to today", () => {
    const fields = emptyImportFields();
    const today = new Date().toISOString().slice(0, 10);
    expect(fields.tradeDate.value).toBe(today);
  });

  it("sets confidence to 100 and editable to true for all fields", () => {
    const fields = emptyImportFields();
    for (const key of Object.keys(fields)) {
      const field = fields[key as keyof typeof fields];
      expect(field.confidence).toBe(100);
      expect(field.editable).toBe(true);
    }
  });

  it("starts most fields with empty string value", () => {
    const fields = emptyImportFields();
    const nonEmptyFields = ["currency", "dataDate", "tradeDate", "transactionType"];
    for (const [key, field] of Object.entries(fields)) {
      if (!nonEmptyFields.includes(key)) {
        expect(field.value).toBe("");
      }
    }
  });
});
