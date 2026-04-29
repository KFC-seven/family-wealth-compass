import { ImportSource, ImportExample, RecognizedAssetRow, RecognizedField } from "@/types/import";

export const mockImportExamples: ImportExample[] = [
  {
    id: "example-alipay",
    source: "alipay",
    label: "支付宝持仓示例",
    description: "包含场外基金、黄金积存金和现金余额",
    screenshotLabel: "支付宝-基金账户",
  },
  {
    id: "example-broker",
    source: "broker",
    label: "券商 App 持仓示例",
    description: "包含A股、美股、场内基金和可用资金",
    screenshotLabel: "华泰证券-持仓",
  },
  {
    id: "example-bank",
    source: "bank",
    label: "银行 App 资产示例",
    description: "包含银行理财、活期存款和积存金",
    screenshotLabel: "招商银行-资产总览",
  },
];

function field(value: string, confidence: number, editable = true): RecognizedField {
  return { value, confidence, editable };
}

export const mockAlipayRows: RecognizedAssetRow[] = [
  {
    id: "rec-1",
    source: "alipay",
    fields: {
      member: field("爸爸", 85), account: field("支付宝基金账户", 92),
      assetName: field("易方达沪深300ETF联接A", 96), assetCode: field("110020", 98),
      assetType: field("mutualFund", 90), currency: field("CNY", 99),
      quantity: field("8000", 94), price: field("1.56", 88),
      marketValue: field("12480", 91), cost: field("11360", 80),
      holdingReturn: field("1120", 78), holdingReturnRate: field("9.86%", 75),
      cashBalance: field("1280.5", 85), dataDate: field("2026-04-28", 95), note: field("", 100),
    },
    status: "normal", issues: [], userAction: "save",
  },
  {
    id: "rec-2",
    source: "alipay",
    fields: {
      member: field("爸爸", 82), account: field("支付宝基金账户", 90),
      assetName: field("富国天惠成长混合A", 94), assetCode: field("161005", 96),
      assetType: field("mutualFund", 88), currency: field("CNY", 99),
      quantity: field("5000", 92), price: field("2.32", 86),
      marketValue: field("11600", 90), cost: field("10900", 78),
      holdingReturn: field("700", 76), holdingReturnRate: field("6.42%", 72),
      cashBalance: field("", 0), dataDate: field("2026-04-28", 95), note: field("", 100),
    },
    status: "normal", issues: [], userAction: "save",
  },
  {
    id: "rec-3",
    source: "alipay",
    fields: {
      member: field("妈妈", 80), account: field("支付宝基金账户", 88),
      assetName: field("博时黄金ETF联接A", 92), assetCode: field("002610", 94),
      assetType: field("mutualFund", 86), currency: field("CNY", 99),
      quantity: field("3000", 90), price: field("1.21", 84),
      marketValue: field("3630", 88), cost: field("3360", 76),
      holdingReturn: field("270", 74), holdingReturnRate: field("8.04%", 70),
      cashBalance: field("", 0), dataDate: field("2026-04-28", 95), note: field("", 100),
    },
    status: "normal", issues: [], userAction: "save",
  },
  {
    id: "rec-4",
    source: "alipay",
    fields: {
      member: field("妈妈", 75), account: field("支付宝基金账户", 82),
      assetName: field("天弘沪深300指数A", 88), assetCode: field("000961", 90),
      assetType: field("mutualFund", 82), currency: field("CNY", 99),
      quantity: field("6000", 86), price: field("0.98", 80),
      marketValue: field("5880", 84), cost: field("6300", 72),
      holdingReturn: field("-420", 70), holdingReturnRate: field("-6.67%", 68),
      cashBalance: field("3200", 78), dataDate: field("2026-04-28", 95), note: field("", 100),
    },
    status: "low_confidence",
    issues: ["持仓收益率为负，请确认数据是否正确"],
    userAction: "pending",
  },
  {
    id: "rec-5",
    source: "alipay",
    fields: {
      member: field("", 0), account: field("", 0),
      assetName: field("中欧医疗健康混合A", 45), assetCode: field("", 20),
      assetType: field("mutualFund", 50), currency: field("CNY", 99),
      quantity: field("5000", 50), price: field("0.82", 45),
      marketValue: field("4100", 55), cost: field("", 0),
      holdingReturn: field("", 0), holdingReturnRate: field("", 0),
      cashBalance: field("", 0), dataDate: field("2026-04-20", 60), note: field("疑似已清仓", 30),
    },
    status: "missing_field",
    issues: ["成员未识别", "账户未识别", "持仓成本缺失"],
    userAction: "pending",
  },
];

export const mockBrokerRows: RecognizedAssetRow[] = [
  {
    id: "rec-6",
    source: "broker",
    fields: {
      member: field("爸爸", 86), account: field("华泰证券账户", 94),
      assetName: field("贵州茅台", 98), assetCode: field("600519", 99),
      assetType: field("aShare", 92), currency: field("CNY", 99),
      quantity: field("200", 96), price: field("1820.00", 90),
      marketValue: field("364000", 93), cost: field("336000", 82),
      holdingReturn: field("28000", 80), holdingReturnRate: field("8.33%", 76),
      cashBalance: field("", 0), dataDate: field("2026-04-28", 95), note: field("", 100),
    },
    status: "normal", issues: [], userAction: "save",
  },
  {
    id: "rec-7",
    source: "broker",
    fields: {
      member: field("爸爸", 84), account: field("华泰证券账户", 92),
      assetName: field("宁德时代", 96), assetCode: field("300750", 98),
      assetType: field("aShare", 90), currency: field("CNY", 99),
      quantity: field("800", 94), price: field("198.50", 88),
      marketValue: field("158800", 91), cost: field("169600", 80),
      holdingReturn: field("-10800", 78), holdingReturnRate: field("-6.37%", 74),
      cashBalance: field("", 0), dataDate: field("2026-04-28", 95), note: field("跌幅较大", 70),
    },
    status: "low_confidence",
    issues: ["持仓亏损超5%，请确认数据"],
    userAction: "save",
  },
  {
    id: "rec-8",
    source: "broker",
    fields: {
      member: field("爸爸", 82), account: field("华泰证券账户", 90),
      assetName: field("Apple Inc.", 88), assetCode: field("AAPL", 95),
      assetType: field("usStock", 86), currency: field("USD", 99),
      quantity: field("50", 92), price: field("198.00", 86),
      marketValue: field("9900", 88), cost: field("8750", 78),
      holdingReturn: field("1150", 76), holdingReturnRate: field("6.57%", 72),
      cashBalance: field("32500", 82), dataDate: field("2026-04-28", 95), note: field("", 100),
    },
    status: "normal", issues: [], userAction: "save",
  },
  {
    id: "rec-9",
    source: "broker",
    fields: {
      member: field("爸爸", 80), account: field("华泰证券账户", 88),
      assetName: field("海康威视", 55), assetCode: field("002415", 60),
      assetType: field("aShare", 50), currency: field("CNY", 99),
      quantity: field("1000", 55), price: field("35.00", 50),
      marketValue: field("35000", 58), cost: field("32000", 45),
      holdingReturn: field("2900", 42), holdingReturnRate: field("", 0),
      cashBalance: field("", 0), dataDate: field("2026-03-10", 40),
      note: field("可能已清仓，请确认", 35),
    },
    status: "duplicate",
    issues: ["疑似与已有持仓重复", "海康威视已有清仓记录"],
    userAction: "pending",
  },
];

export const mockBankRows: RecognizedAssetRow[] = [
  {
    id: "rec-10",
    source: "bank",
    fields: {
      member: field("爸爸", 84), account: field("招商银行账户", 92),
      assetName: field("招商银行理财产品", 94), assetCode: field("", 0),
      assetType: field("bankWealth", 88), currency: field("CNY", 99),
      quantity: field("1", 96), price: field("153600.00", 88),
      marketValue: field("153600", 92), cost: field("150000", 80),
      holdingReturn: field("3600", 78), holdingReturnRate: field("2.40%", 74),
      cashBalance: field("85000", 86), dataDate: field("2026-04-28", 95), note: field("", 100),
    },
    status: "normal", issues: [], userAction: "save",
  },
  {
    id: "rec-11",
    source: "bank",
    fields: {
      member: field("孩子", 82), account: field("招商银行账户", 90),
      assetName: field("招商银行朝朝宝", 92), assetCode: field("", 0),
      assetType: field("bankWealth", 86), currency: field("CNY", 99),
      quantity: field("1", 94), price: field("45720.00", 86),
      marketValue: field("45720", 90), cost: field("45000", 78),
      holdingReturn: field("720", 76), holdingReturnRate: field("1.60%", 72),
      cashBalance: field("15000", 84), dataDate: field("2026-04-28", 95), note: field("", 100),
    },
    status: "normal", issues: [], userAction: "save",
  },
  {
    id: "rec-12",
    source: "bank",
    fields: {
      member: field("妈妈", 78), account: field("工商银行理财账户", 88),
      assetName: field("工商银行添利宝", 90), assetCode: field("", 0),
      assetType: field("bankWealth", 84), currency: field("CNY", 99),
      quantity: field("1", 92), price: field("291200.00", 84),
      marketValue: field("291200", 88), cost: field("280000", 76),
      holdingReturn: field("5600", 74), holdingReturnRate: field("2.00%", 70),
      cashBalance: field("", 50), dataDate: field("2026-04-28", 95), note: field("", 100),
    },
    status: "pending_confirm",
    issues: ["现金余额字段模糊，请确认"],
    userAction: "pending",
  },
  {
    id: "rec-13",
    source: "bank",
    fields: {
      member: field("妈妈", 76), account: field("黄金积存金账户", 86),
      assetName: field("积存金", 92), assetCode: field("", 0),
      assetType: field("gold", 82), currency: field("CNY", 99),
      quantity: field("500", 88), price: field("478.00", 82),
      marketValue: field("239000", 86), cost: field("229000", 74),
      holdingReturn: field("10000", 72), holdingReturnRate: field("4.37%", 66),
      cashBalance: field("", 0), dataDate: field("2026-04-28", 95), note: field("", 100),
    },
    status: "normal", issues: [], userAction: "save",
  },
  {
    id: "rec-14",
    source: "bank",
    fields: {
      member: field("", 0), account: field("", 0),
      assetName: field("活期存款", 65), assetCode: field("", 0),
      assetType: field("cash", 60), currency: field("CNY", 99),
      quantity: field("", 0), price: field("", 0),
      marketValue: field("52180", 55), cost: field("", 0),
      holdingReturn: field("", 0), holdingReturnRate: field("", 0),
      cashBalance: field("52180", 55), dataDate: field("2026-04-20", 50),
      note: field("无法识别归属成员和账户", 30),
    },
    status: "missing_field",
    issues: ["成员未识别", "账户未识别", "无法判断是否为已有账户"],
    userAction: "pending",
  },
];

export const mockImportRowsMap: Record<string, RecognizedAssetRow[]> = {
  "example-alipay": mockAlipayRows,
  "example-broker": mockBrokerRows,
  "example-bank": mockBankRows,
};
