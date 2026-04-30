import type { PushProvider, PushDailyBriefInput, PushResult, PushProviderHealth } from "../types";
import { formatBriefForWeCom } from "../formatter";

/** 企业微信群机器人 Webhook provider */
export class WeComBotProvider implements PushProvider {
  name = "wecom-bot";
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.WECHAT_WORK_WEBHOOK_URL ?? "";
  }

  isEnabled(): boolean {
    return (
      process.env.WECHAT_PUSH_ENABLED === "true" &&
      process.env.WECHAT_PUSH_PROVIDER === "wecom-bot" &&
      this.webhookUrl.length > 0
    );
  }

  async sendDailyBrief(input: PushDailyBriefInput): Promise<PushResult> {
    if (!this.isEnabled()) {
      return { success: false, provider: this.name, message: "WeCom bot 未启用或未配置", sentAt: new Date().toISOString() };
    }

    const content = formatBriefForWeCom(input);

    try {
      const resp = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msgtype: "markdown",
          markdown: { content },
        }),
      });

      const json = await resp.json();
      if (json.errcode !== 0) {
        return { success: false, provider: this.name, message: `WeCom error: ${json.errmsg}`, sentAt: new Date().toISOString() };
      }

      return { success: true, provider: this.name, message: "企业微信推送成功", sentAt: new Date().toISOString() };
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
