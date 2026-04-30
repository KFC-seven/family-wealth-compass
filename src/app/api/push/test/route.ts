import { createSuccessResponse, handleApiError } from "@/server/api/response";
import { getPushProvider } from "@/server/push/registry";

export async function POST() {
  try {
    const provider = getPushProvider();
    const result = provider.sendTest
      ? await provider.sendTest()
      : await provider.sendDailyBrief({
          title: "测试推送", summary: "这是一条来自家庭财富罗盘的测试推送消息。", dailyReturn: 0,
          riskAlerts: [], adviceCards: [], includeTotalAssets: false, includeMemberDetails: false,
          includeAiAdvice: false, onlyHighRisk: false,
        });

    return createSuccessResponse({
      success: result.success, provider: result.provider, message: result.message,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
