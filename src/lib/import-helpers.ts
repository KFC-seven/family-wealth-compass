import type { RecognizedAssetRow } from "@/types/import";

export function emptyImportFields(): RecognizedAssetRow["fields"] {
  return {
    member: { value: "", confidence: 100, editable: true },
    account: { value: "", confidence: 100, editable: true },
    assetName: { value: "", confidence: 100, editable: true },
    assetCode: { value: "", confidence: 100, editable: true },
    assetType: { value: "", confidence: 100, editable: true },
    currency: { value: "CNY", confidence: 100, editable: true },
    market: { value: "", confidence: 100, editable: true },
    quantity: { value: "", confidence: 100, editable: true },
    price: { value: "", confidence: 100, editable: true },
    marketValue: { value: "", confidence: 100, editable: true },
    cost: { value: "", confidence: 100, editable: true },
    holdingReturn: { value: "", confidence: 100, editable: true },
    holdingReturnRate: { value: "", confidence: 100, editable: true },
    cashBalance: { value: "", confidence: 100, editable: true },
    dataDate: { value: new Date().toISOString().slice(0, 10), confidence: 100, editable: true },
    note: { value: "", confidence: 100, editable: true },
    transactionType: { value: "BUY", confidence: 100, editable: true },
    tradeDate: { value: new Date().toISOString().slice(0, 10), confidence: 100, editable: true },
    grossAmount: { value: "", confidence: 100, editable: true },
    fee: { value: "", confidence: 100, editable: true },
    tax: { value: "", confidence: 100, editable: true },
    netAmount: { value: "", confidence: 100, editable: true },
    cashImpact: { value: "", confidence: 100, editable: true },
    realizedReturn: { value: "", confidence: 100, editable: true },
  };
}
