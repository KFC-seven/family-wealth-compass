import type { PushProvider, PushDailyBriefInput, PushResult, PushProviderHealth } from "../types";
import { formatBriefForPush } from "../formatter";

export class MockPushProvider implements PushProvider {
  name = "mock";

  isEnabled(): boolean { return true; }

  async sendDailyBrief(input: PushDailyBriefInput): Promise<PushResult> {
    const content = formatBriefForPush(input);
    console.log(`[MockPush] 推送预览:\n${content}`);
    return { success: true, provider: this.name, message: "Mock 推送成功（未真实发送）", sentAt: new Date().toISOString() };
  }

  async sendTest(): Promise<PushResult> {
    return { success: true, provider: this.name, message: "Mock 测试推送成功", sentAt: new Date().toISOString() };
  }

  async healthCheck(): Promise<PushProviderHealth> {
    return { status: "HEALTHY", message: "Mock push 始终可用", checkedAt: new Date().toISOString() };
  }
}
