import type { PushProvider } from "./types";
import { MockPushProvider } from "./providers/mock-push-provider";
import { WeComBotProvider } from "./providers/wecom-bot-provider";
import { ServerChanProvider } from "./providers/server-chan-provider";

export function getPushProvider(): PushProvider {
  const providerName = process.env.WECHAT_PUSH_PROVIDER ?? "mock";

  if (providerName === "wecom-bot") {
    const p = new WeComBotProvider();
    if (p.isEnabled()) return p;
  }

  if (providerName === "server-chan") {
    const p = new ServerChanProvider();
    if (p.isEnabled()) return p;
  }

  return new MockPushProvider();
}
