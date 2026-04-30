import type { AiProvider } from "./types";
import { MockAiProvider } from "./providers/mock-ai-provider";
import { DeepSeekProvider } from "./providers/deepseek-provider";
import { AliyunBailianProvider } from "./providers/aliyun-bailian-provider";

export function getAiProvider(): AiProvider {
  const providerName = process.env.AI_PROVIDER ?? "mock";

  if (providerName === "deepseek") {
    const p = new DeepSeekProvider();
    if (p.isEnabled()) return p;
    console.warn("[AI] DeepSeek 未完整配置，fallback 到 mock");
  }

  if (providerName === "aliyun-bailian") {
    const p = new AliyunBailianProvider();
    if (p.isEnabled()) return p;
    console.warn("[AI] 阿里云百炼未完整配置，fallback 到 mock");
  }

  return new MockAiProvider();
}
