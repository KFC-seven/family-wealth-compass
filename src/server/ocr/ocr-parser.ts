import type { OcrRowResult } from "./types";

const SYSTEM_PROMPT = `你是投资组合截图数据提取助手。从 OCR 识别出的原始文本中提取结构化持仓/交易数据。

输出必须是严格的 JSON 对象，格式为 {"rows": [...]}，每个元素代表一行持仓记录：

{
  "member": "string | null (姓名，OCR 文本中如有则填，否则填 null)",
  "account": "string (必填，账户名，如 支付宝基金账户/华泰证券/工商银行)",
  "assetName": "string (必填，资产名称)",
  "assetCode": "string | null (代码)",
  "assetType": "A_SHARE | MUTUAL_FUND | BOND | CASH | US_STOCK | ETF | GOLD_ACCUMULATION | OTHER",
  "currency": "CNY | USD | HKD (默认 CNY)",
  "quantity": "string | null (份额/数量)",
  "price": "string | null (单价)",
  "marketValue": "string | null (当前市值/持仓金额)",
  "cost": "string | null (本金/成本，若能推断则填)",
  "holdingReturn": "string | null (持仓盈亏金额，注意不是昨日收益！区分"昨日收益"和"持仓收益")",
  "holdingReturnRate": "string | null (持仓盈亏率，如 12.5% 或 0.125)",
  "dataDate": "string | null (数据日期)"
}

规则:
- account 根据平台和文本内容推断: ALIPAY→"支付宝基金账户", BROKER→券商名称, BANK→银行名称
- assetName 完整提取基金/股票全称，可合并跨行碎片（如"国投瑞银白银期货"+"(LOF)C"→"国投瑞银白银期货(LOF)C"）
- assetType: 含"基金/混合/联接/指数/QDII/黄金/ETF"→MUTUAL_FUND, 含"股票/A股/美股"→A_SHARE, 含"债券/债"→BOND, 含"现金/货币/活期"→CASH
- 支付宝基金持仓表格 OCR 文本格式（逐行排列，从上到下从左到右）:
  每行基金依次出现: [基金全称(可能被后缀打断为2-3个片段)] [持仓金额(市值)] [持仓收益金额(带+号)] [基金后缀如(LOF)C/标签如"金选""定投"] [昨日收益金额(可能为0.00)] [持仓收益率(含%号)] [更多标签]
  示例 OCR 文本: "国投瑞银白银期货\n9,043.85\n+1,943.85\n(LOF)C\n0.00\n+27.38%\n定投"
  正确解析: assetName="国投瑞银白银期货(LOF)C", marketValue="9043.85", holdingReturn="+1943.85", holdingReturnRate="+27.38%"
  注意: "0.00"是昨日收益，忽略它！"+1,943.85"才是持仓收益！"+27.38%"是持仓收益率！
  数学验证: cost = marketValue - holdingReturn = 9043.85 - 1943.85 = 7100, rate = 1943.85/7100 ≈ 27.38% ✓
- 如果持仓收益显示为0但有利率，可能是数据未更新，照实提取
- marketValue/holdingReturn/cost 提取时去掉逗号和货币符号
- 正收益为正数，负收益为负数
- 无法提取的字段填 null
- 如果无法提取任何有效数据，输出 {"rows": []}
- 只输出 JSON，不要任何其他文字`;

/**
 * Call DeepSeek to parse raw OCR text into structured rows.
 * Falls back to simple line splitting on failure.
 */
export async function parseOcrTextWithAI(
  rawText: string,
  sourcePlatform: string,
): Promise<OcrRowResult[]> {
  // Skip AI call for empty or very short text
  const trimmed = rawText.trim();
  if (!trimmed || trimmed.length < 3) {
    return simpleParse(trimmed);
  }

  const apiKey = process.env.DEEPSEEK_API_KEY ?? "";
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const model = process.env.AI_MODEL ?? "deepseek-chat";

  if (!apiKey) {
    console.warn("[OCR-Parser] DeepSeek API key 未配置，使用简单解析");
    return simpleParse(trimmed);
  }

  const userPrompt = `数据来源平台: ${sourcePlatform}
请根据平台类型推断 account 字段（如 ALIPAY 对应"支付宝基金账户"）。

OCR 识别出的原始文本（按阅读顺序排列）:
"""
${trimmed.substring(0, 6000)}
"""

请提取结构化持仓数据。输出格式: {"rows": [...]}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`DeepSeek API ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek 返回内容为空");

    const parsed = JSON.parse(content);

    // Handle both { "rows": [...] } wrapper and direct array
    const rows: unknown[] = Array.isArray(parsed) ? parsed : parsed.rows ?? [];

    if (!Array.isArray(rows) || rows.length === 0) {
      console.warn("[OCR-Parser] AI 未能提取有效行，fallback 到简单解析");
      return simpleParse(trimmed);
    }

    return rows.map((r: any) => ({
      member: r.member ?? undefined,
      account: r.account ?? undefined,
      assetName: String(r.assetName ?? ""),
      assetCode: r.assetCode ?? undefined,
      assetType: String(r.assetType ?? "STOCK"),
      currency: r.currency ?? "CNY",
      quantity: r.quantity != null ? String(r.quantity) : undefined,
      price: r.price != null ? String(r.price) : undefined,
      marketValue: r.marketValue != null ? String(r.marketValue) : undefined,
      cost: r.cost != null ? String(r.cost) : undefined,
      holdingReturn: r.holdingReturn != null ? String(r.holdingReturn) : undefined,
      holdingReturnRate: r.holdingReturnRate ?? undefined,
      dataDate: r.dataDate ?? undefined,
      rawText: trimmed.substring(0, 500),
      confidence: 80,
    }));
  } catch (err) {
    console.warn("[OCR-Parser] AI 解析失败，使用简单解析:", (err as Error).message);
    return simpleParse(trimmed);
  }
}

function simpleParse(rawText: string): OcrRowResult[] {
  const lines = rawText
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  return lines.map((line) => ({
    assetName: line,
    assetType: "STOCK",
    rawText: line,
    confidence: 60,
  }));
}
