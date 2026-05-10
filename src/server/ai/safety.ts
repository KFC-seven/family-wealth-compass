import type { AiBriefOutput } from "./types";

const FORBIDDEN_PATTERNS = [
  /保证收益/, /必赚/, /无风险/, /立即买入/, /必须买入/,
  /必须卖出/, /满仓/, /梭哈/, /无脑加仓/, /all[-\s]?in/i,
  /稳赚/, /包赚/, /躺赚/, /翻倍/,
];

const REQUIRED_DISCLAIMER = "不构成确定性投资指令";

export interface SafetyCheckResult {
  passed: boolean;
  issues: string[];
}

export function checkSafety(output: AiBriefOutput): SafetyCheckResult {
  const issues: string[] = [];
  const text = JSON.stringify(output);

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(`包含禁止词: ${pattern.source}`);
    }
  }

  if (!output.disclaimer || !output.disclaimer.includes(REQUIRED_DISCLAIMER)) {
    issues.push("缺少免责声明或声明不完整");
  }

  for (const card of output.adviceCards) {
    if (!card.reason || card.reason.length < 2) issues.push(`建议缺少 reason: ${card.adviceType}`);
    if (!card.riskLevel) issues.push(`建议缺少 riskLevel: ${card.adviceType}`);
    if (card.adviceType !== "NO_ACTION" && (!card.triggerCondition || card.triggerCondition.length < 2))
      issues.push(`建议缺少 triggerCondition: ${card.adviceType}`);
    if (card.adviceType !== "NO_ACTION" && (!card.uncertainty || card.uncertainty.length < 2))
      issues.push(`建议缺少 uncertainty: ${card.adviceType}`);
    if (!card.philosophyMatch || card.philosophyMatch.length < 3) issues.push(`建议缺少 philosophyMatch: ${card.adviceType}`);
  }

  return { passed: issues.length === 0, issues };
}
