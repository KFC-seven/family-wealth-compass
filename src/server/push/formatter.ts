import type { PushDailyBriefInput } from "./types";

/** 将简报格式化为微信推送文本 */
export function formatBriefForPush(input: PushDailyBriefInput): string {
  const lines: string[] = [];
  const sign = input.dailyReturn >= 0 ? "+" : "";

  lines.push("家庭财富罗盘｜每日简报");
  lines.push("");

  if (input.includeTotalAssets && input.totalAssets != null) {
    lines.push(`总资产：¥${(input.totalAssets / 10000).toFixed(1)}万`);
  }

  lines.push(`今日收益：${sign}¥${input.dailyReturn.toFixed(0)}`);
  lines.push(`摘要：${input.summary.slice(0, 100)}`);

  if (input.riskAlerts.length > 0) {
    const alerts = input.onlyHighRisk
      ? input.riskAlerts.filter((r) => r.level === "high")
      : input.riskAlerts.slice(0, 3);
    if (alerts.length > 0) {
      lines.push("");
      lines.push("⚠ 风险提醒：");
      alerts.forEach((r, i) => lines.push(`${i + 1}. [${r.level}] ${r.description.slice(0, 80)}`));
    }
  }

  if (input.includeAiAdvice && input.adviceCards.length > 0) {
    const cards = input.onlyHighRisk
      ? input.adviceCards.filter((c) => c.adviceType === "REDUCE_CONCENTRATION" || c.adviceType === "REDUCE_OBSERVE")
      : input.adviceCards.slice(0, 2);
    if (cards.length > 0) {
      lines.push("");
      lines.push("💡 操作关注：");
      cards.forEach((c, i) => lines.push(`${i + 1}. ${c.relatedAssetName}: ${c.reason.slice(0, 60)}`));
    }
  }

  lines.push("");
  lines.push("查看完整简报：应用中查看");

  return lines.join("\n");
}

/** 格式化 Markdown 版本（企业微信） */
export function formatBriefForWeCom(input: PushDailyBriefInput): string {
  const sign = input.dailyReturn >= 0 ? "+" : "";
  const lines: string[] = [];

  lines.push("## 家庭财富罗盘｜每日简报");
  lines.push("");

  if (input.includeTotalAssets && input.totalAssets != null) {
    lines.push(`> 总资产：¥${(input.totalAssets / 10000).toFixed(1)}万`);
  }
  lines.push(`> 今日收益：<font color="${input.dailyReturn >= 0 ? 'warning' : 'info'}">${sign}¥${input.dailyReturn.toFixed(0)}</font>`);
  lines.push(`> ${input.summary.slice(0, 100)}`);

  if (input.riskAlerts.length > 0) {
    const alerts = input.onlyHighRisk
      ? input.riskAlerts.filter((r) => r.level === "high")
      : input.riskAlerts.slice(0, 3);
    if (alerts.length > 0) {
      lines.push("");
      lines.push("**⚠ 风险提醒：**");
      alerts.forEach((r, i) => lines.push(`${i + 1}. [${r.level}] ${r.description.slice(0, 80)}`));
    }
  }

  if (input.includeAiAdvice && input.adviceCards.length > 0) {
    lines.push("");
    lines.push("**💡 操作关注：**");
    input.adviceCards.slice(0, 2).forEach((c, i) => lines.push(`${i + 1}. ${c.relatedAssetName}: ${c.reason.slice(0, 60)}`));
  }

  lines.push("");
  lines.push("[查看完整简报](应用内查看)");

  return lines.join("\n");
}
