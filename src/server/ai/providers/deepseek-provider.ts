import type { AiProvider, AiBriefInput, AiBriefOutput, AiProviderHealth } from "../types";
import { dailyBriefAiOutputSchema } from "../output-schema";

/**
 * DeepSeek AI provider。
 * 需要 AI_ENABLED=true 且 DEEPSEEK_API_KEY 存在。
 * API: https://api.deepseek.com/v1/chat/completions
 */
export class DeepSeekProvider implements AiProvider {
  name = "deepseek";
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeout: number;
  private maxRetries: number;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY ?? "";
    this.baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
    this.model = process.env.AI_MODEL ?? "deepseek-chat";
    this.timeout = parseInt(process.env.AI_REQUEST_TIMEOUT_MS ?? "60000", 10);
    this.maxRetries = parseInt(process.env.AI_MAX_RETRIES ?? "2", 10);
  }

  isEnabled(): boolean {
    return (
      process.env.AI_ENABLED === "true" &&
      process.env.AI_PROVIDER === "deepseek" &&
      this.apiKey.length > 0
    );
  }

  async generateStructuredBrief(input: AiBriefInput): Promise<AiBriefOutput> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(input);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        const resp = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
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
        const validated = dailyBriefAiOutputSchema.parse(parsed);

        return validated as AiBriefOutput;
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`DeepSeek 请求失败 (${this.maxRetries + 1}次): ${lastError?.message}`);
  }

  async healthCheck(): Promise<AiProviderHealth> {
    if (!this.isEnabled()) {
      return { status: "DISABLED", message: "DeepSeek 未启用或未配置", checkedAt: new Date().toISOString() };
    }
    return { status: "DEGRADED", message: "配置已检测，真实调用需联网验证", checkedAt: new Date().toISOString() };
  }
}

function buildSystemPrompt(): string {
  return `你是家庭财富管理辅助分析助手。根据家庭资产数据生成结构化简报。
你必须以 JSON 格式输出，严格遵守提供的 schema。
你的建议必须包含 reason、riskLevel、triggerCondition、uncertainty、philosophyMatch。
不得使用"保证收益""必赚""无风险""立即买入""必须买入""必须卖出""满仓""梭哈"等绝对化表述。
所有建议仅供参考，必须包含免责声明。`;
}

function buildUserPrompt(input: AiBriefInput): string {
  return JSON.stringify({
    task: "生成每日投资简报",
    date: input.date,
    household: {
      name: input.householdName,
      totalAssets: input.totalAssets,
      dailyReturn: input.dailyReturn,
      cumulativeReturn: input.cumulativeReturn,
      holdingReturn: input.holdingReturn,
      realizedReturn: input.realizedReturn,
      cashBalance: input.cashBalance,
    },
    members: input.members.map((m) => ({
      name: m.name,
      role: m.role,
      totalAssets: m.totalAssets,
      dailyReturn: m.dailyReturn,
      riskPreference: m.riskPreference,
      philosophy: m.philosophy,
      holdings: m.holdings.map((h) => ({
        name: h.name, type: h.type, marketValue: h.marketValue,
        holdingReturn: h.holdingReturn, weight: (h.weight * 100).toFixed(1) + "%",
      })),
    })),
    riskSignals: input.riskSignals,
    newsHighlights: input.newsHighlights,
    marketSummary: input.marketSummary,
    outputSchema: "json with title, summary, marketOverview[], householdImpact, memberImpacts[], riskAlerts[], adviceCards[], newsItems[], disclaimer",
  }, null, 2);
}
