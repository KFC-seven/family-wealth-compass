import type { AiProvider, AiBriefInput, AiBriefOutput, AiProviderHealth } from "../types";

/** 阿里云百炼 provider 骨架 */
export class AliyunBailianProvider implements AiProvider {
  name = "aliyun-bailian";

  isEnabled(): boolean {
    return (
      process.env.AI_ENABLED === "true" &&
      process.env.AI_PROVIDER === "aliyun-bailian" &&
      !!process.env.ALIYUN_BAILIAN_API_KEY
    );
  }

  async generateStructuredBrief(_input: AiBriefInput): Promise<AiBriefOutput> {
    throw new Error("阿里云百炼 provider 本阶段未实现，请使用 AI_PROVIDER=mock 或 deepseek");
  }

  async healthCheck(): Promise<AiProviderHealth> {
    if (!this.isEnabled()) return { status: "DISABLED", message: "未配置", checkedAt: new Date().toISOString() };
    return { status: "DEGRADED", message: "骨架，未实现真实调用", checkedAt: new Date().toISOString() };
  }
}
