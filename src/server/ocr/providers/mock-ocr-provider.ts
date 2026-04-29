import type { OcrProvider, OcrRecognizeInput, OcrRecognizeResult, OcrRowResult, OcrProviderHealth } from "../types";
import type { ImportSourcePlatform } from "@/generated/prisma/client";

/**
 * Mock OCR provider。
 * 根据 sourcePlatform 返回预定义的识别结果，永远可用。
 */
export class MockOcrProvider implements OcrProvider {
  name = "mock";

  isEnabled(): boolean {
    return true;
  }

  async recognize(input: OcrRecognizeInput): Promise<OcrRecognizeResult> {
    const startedAt = new Date().toISOString();
    // 模拟处理延迟
    await new Promise((r) => setTimeout(r, 300));

    const rows = generateMockRows(input.sourcePlatform);
    const finishedAt = new Date().toISOString();

    return {
      provider: this.name,
      rawText: rows.map((r) => r.rawText).join("\n"),
      rows,
      confidence: 85,
      startedAt,
      finishedAt,
      durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  async healthCheck(): Promise<OcrProviderHealth> {
    return { status: "HEALTHY", message: "Mock OCR 始终可用", checkedAt: new Date().toISOString() };
  }
}

function generateMockRows(platform: ImportSourcePlatform): OcrRowResult[] {
  if (platform === "ALIPAY") {
    return [
      {
        member: "爸爸",
        account: "支付宝基金账户",
        assetName: "易方达沪深300ETF联接A",
        assetCode: "110020",
        assetType: "MUTUAL_FUND",
        currency: "CNY",
        quantity: "8000",
        price: "1.56",
        marketValue: "12480",
        cost: "11360",
        holdingReturn: "1120",
        dataDate: new Date().toISOString().slice(0, 10),
        rawText: "易方达沪深300ETF联接A | 110020 | 8000份 | 1.56 | 12480",
        confidence: 92,
      },
      {
        member: "爸爸",
        account: "支付宝基金账户",
        assetName: "富国天惠成长混合A",
        assetCode: "161005",
        assetType: "MUTUAL_FUND",
        currency: "CNY",
        quantity: "5000",
        price: "2.32",
        marketValue: "11600",
        cost: "10900",
        holdingReturn: "700",
        dataDate: new Date().toISOString().slice(0, 10),
        rawText: "富国天惠成长混合A | 161005 | 5000份 | 2.32 | 11600",
        confidence: 88,
      },
    ];
  }

  if (platform === "BROKER") {
    return [
      {
        member: "爸爸",
        account: "华泰证券账户",
        assetName: "贵州茅台",
        assetCode: "600519",
        assetType: "A_SHARE",
        currency: "CNY",
        quantity: "200",
        price: "1820",
        marketValue: "364000",
        cost: "336000",
        holdingReturn: "28000",
        dataDate: new Date().toISOString().slice(0, 10),
        rawText: "贵州茅台 | 600519 | 200股 | 1820 | 364000",
        confidence: 95,
      },
      {
        member: "爸爸",
        account: "华泰证券账户",
        assetName: "宁德时代",
        assetCode: "300750",
        assetType: "A_SHARE",
        currency: "CNY",
        quantity: "800",
        price: "198.5",
        marketValue: "158800",
        cost: "169600",
        holdingReturn: "-10800",
        dataDate: new Date().toISOString().slice(0, 10),
        rawText: "宁德时代 | 300750 | 800股 | 198.5 | 158800",
        confidence: 90,
      },
    ];
  }

  // BANK or OTHER
  return [
    {
      member: "妈妈",
      account: "工商银行理财账户",
      assetName: "工商银行添利宝",
      assetType: "BANK_WEALTH",
      currency: "CNY",
      quantity: "1",
      price: "291200",
      marketValue: "291200",
      cost: "280000",
      holdingReturn: "5600",
      dataDate: new Date().toISOString().slice(0, 10),
      rawText: "工商银行添利宝 | 银行理财 | 291200",
      confidence: 85,
    },
  ];
}
