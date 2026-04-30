import type { PushProvider, PushDailyBriefInput, PushResult, PushProviderHealth } from "../types";
import { formatBriefForPush } from "../formatter";

/** Server 酱推送 provider */
export class ServerChanProvider implements PushProvider {
  name = "server-chan";
  private sendKey: string;

  constructor() {
    this.sendKey = process.env.SERVER_CHAN_SEND_KEY ?? "";
  }

  isEnabled(): boolean {
    return (
      process.env.WECHAT_PUSH_ENABLED === "true" &&
      process.env.WECHAT_PUSH_PROVIDER === "server-chan" &&
      this.sendKey.length > 0
    );
  }

  async sendDailyBrief(input: PushDailyBriefInput): Promise<PushResult> {
    if (!this.isEnabled()) {
      return { success: false, provider: this.name, message: "Server 酱未启用或未配置", sentAt: new Date().toISOString() };
    }

    const content = formatBriefForPush(input);

    try {
      const resp = await fetch(`https://sctapi.ftqq.com/${this.sendKey}.send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title.slice(0, 32),
          desp: content,
        }),
      });

      const json = await resp.json();
      if (json.code !== 0) {
        return { success: false, provider: this.name, message: `Server 酱 error: ${json.message}`, sentAt: new Date().toISOString() };
      }

      return { success: true, provider: this.name, message: "Server 酱推送成功", sentAt: new Date().toISOString() };
    } catch (err) {
      return { success: false, provider: this.name, message: `推送失败: ${(err as Error).message}`, sentAt: new Date().toISOString() };
    }
  }

  async sendTest(): Promise<PushResult> {
    return this.sendDailyBrief({
      title: "测试推送", summary: "这是一条来自家庭财富罗盘的测试消息。", dailyReturn: 0,
      riskAlerts: [], adviceCards: [],
      includeTotalAssets: false, includeMemberDetails: false, includeAiAdvice: false, onlyHighRisk: false,
    });
  }

  async healthCheck(): Promise<PushProviderHealth> {
    if (!this.isEnabled()) return { status: "DISABLED", message: "未配置", checkedAt: new Date().toISOString() };
    return { status: "DEGRADED", message: "配置已检测，真实推送需联网验证", checkedAt: new Date().toISOString() };
  }
}
