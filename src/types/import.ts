export type ImportSource = "alipay" | "broker" | "bank" | "manual" | "batch_paste";

export const IMPORT_SOURCE_LABELS: Record<ImportSource, string> = {
  alipay: "支付宝",
  broker: "券商 App",
  bank: "银行 App",
  manual: "手动录入",
  batch_paste: "批量粘贴",
};

export type ImportMode = "ocr" | "manual_holding" | "manual_transaction" | "batch_paste";

export const IMPORT_MODE_LABELS: Record<ImportMode, string> = {
  ocr: "截图识别导入",
  manual_holding: "手动录入持仓",
  manual_transaction: "手动录入交易",
  batch_paste: "批量粘贴",
};

export type ImportSaveMode = "holding_snapshot" | "transaction";

export const IMPORT_SAVE_MODE_LABELS: Record<ImportSaveMode, string> = {
  holding_snapshot: "保存为当前持仓快照",
  transaction: "保存为交易记录",
};

export type RecognitionRowStatus = "normal" | "low_confidence" | "missing_field" | "duplicate" | "pending_confirm";

export type TransactionType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "INTEREST"
  | "DEPOSIT"
  | "WITHDRAW"
  | "FEE"
  | "ADJUSTMENT";

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  BUY: "买入",
  SELL: "卖出",
  DIVIDEND: "分红",
  INTEREST: "利息",
  DEPOSIT: "入金",
  WITHDRAW: "出金",
  FEE: "费用",
  ADJUSTMENT: "调整",
};

export type RecognizedField = {
  value: string;
  confidence: number;
  editable: boolean;
};

export interface RecognizedAssetRow {
  id: string;
  source: ImportSource;
  fields: {
    member: RecognizedField;
    account: RecognizedField;
    assetName: RecognizedField;
    assetCode: RecognizedField;
    assetType: RecognizedField;
    currency: RecognizedField;
    market: RecognizedField;
    quantity: RecognizedField;
    price: RecognizedField;
    marketValue: RecognizedField;
    cost: RecognizedField;
    holdingReturn: RecognizedField;
    holdingReturnRate: RecognizedField;
    cashBalance: RecognizedField;
    dataDate: RecognizedField;
    note: RecognizedField;
    // 交易字段
    transactionType: RecognizedField;
    tradeDate: RecognizedField;
    grossAmount: RecognizedField;
    fee: RecognizedField;
    tax: RecognizedField;
    netAmount: RecognizedField;
    cashImpact: RecognizedField;
    realizedReturn: RecognizedField;
  };
  status: RecognitionRowStatus;
  issues: string[];
  userAction: "save" | "ignore" | "pending";
  txType?: string;
}

export interface ImportValidationIssue {
  rowId: string;
  field: string;
  type: "error" | "warning";
  message: string;
}

export interface ImportSession {
  id: string;
  source: ImportSource | null;
  screenshotUrl: string | null;
  status: "selecting" | "uploaded" | "preview" | "recognizing" | "review" | "editing" | "summary" | "saving" | "done";
  rows: RecognizedAssetRow[];
  validationIssues: ImportValidationIssue[];
  saveMode: ImportSaveMode;
  result?: ImportResult;
  mode: ImportMode;
}

export interface ImportResult {
  savedCount: number;
  ignoredCount: number;
  issueCount: number;
  members: string[];
  accounts: string[];
  assetTypes: string[];
}

export interface ImportSummary {
  totalRows: number;
  ignoredRows: number;
  lowConfidenceRows: number;
  missingFieldRows: number;
  duplicateRows: number;
  totalMarketValue: number;
  members: string[];
  accounts: string[];
  assetTypes: string[];
  saveMode: ImportSaveMode;
}

export interface ImportExample {
  id: string;
  source: ImportSource;
  label: string;
  description: string;
  screenshotLabel: string;
}
