export type ImportSource = "alipay" | "broker" | "bank";

export const IMPORT_SOURCE_LABELS: Record<ImportSource, string> = {
  alipay: "支付宝",
  broker: "券商 App",
  bank: "银行 App",
};

export type ImportSaveMode = "holding_snapshot" | "transaction";

export const IMPORT_SAVE_MODE_LABELS: Record<ImportSaveMode, string> = {
  holding_snapshot: "保存为当前持仓快照",
  transaction: "保存为交易记录",
};

export type RecognitionRowStatus = "normal" | "low_confidence" | "missing_field" | "duplicate" | "pending_confirm";

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
    quantity: RecognizedField;
    price: RecognizedField;
    marketValue: RecognizedField;
    cost: RecognizedField;
    holdingReturn: RecognizedField;
    holdingReturnRate: RecognizedField;
    cashBalance: RecognizedField;
    dataDate: RecognizedField;
    note: RecognizedField;
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
