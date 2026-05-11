import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { validateBody } from "@/server/api/validators";
import { investorProfileUpdateSchema } from "@/server/api/validators";

// ── Enum Mappings ──

const riskPreferenceMap: Record<string, string> = {
  "保守": "CONSERVATIVE",
  "稳健": "STABLE",
  "平衡": "BALANCED",
  "进取": "GROWTH",
  "激进": "AGGRESSIVE",
};
const reverseRiskPreference: Record<string, string> = {
  CONSERVATIVE: "保守", STABLE: "稳健", BALANCED: "平衡",
  GROWTH: "进取", AGGRESSIVE: "激进",
};

const horizonMap: Record<string, string> = {
  "短期": "SHORT",
  "中期": "MEDIUM",
  "中长期": "LONG",
  "长期": "VERY_LONG",
  "超长期": "VERY_LONG",
};
const reverseHorizon: Record<string, string> = {
  SHORT: "短期", MEDIUM: "中期", LONG: "中长期", VERY_LONG: "长期",
};

const adviceStyleMap: Record<string, string> = {
  "保守": "CONSERVATIVE",
  "平衡": "BALANCED",
  "偏积极": "POSITIVE_WITH_CONDITIONS",
};
const reverseAdviceStyle: Record<string, string> = {
  CONSERVATIVE: "保守", BALANCED: "平衡", POSITIVE_WITH_CONDITIONS: "偏积极",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { investorProfile: true },
    });

    if (!member) {
      return createErrorResponse({ code: "NOT_FOUND", message: "成员不存在" }, 404);
    }

    const profile = member.investorProfile;
    if (!profile) {
      return createSuccessResponse(null);
    }

    return createSuccessResponse({
      memberId: profile.memberId,
      riskPreference: reverseRiskPreference[profile.riskPreference] || profile.riskPreference,
      investmentHorizon: reverseHorizon[profile.investmentHorizon] || profile.investmentHorizon,
      primaryGoal: profile.primaryGoal || "",
      maxSingleAssetWeight: Number(profile.maxSingleAssetWeight),
      maxIndustryWeight: Number(profile.maxIndustryWeight),
      minCashReserveMonths: profile.minCashReserveMonths,
      preferredAssets: Array.isArray(profile.preferredAssets) ? profile.preferredAssets : [],
      avoidedAssetsOrBehaviors: Array.isArray(profile.avoidedAssetsOrBehaviors) ? profile.avoidedAssetsOrBehaviors : [],
      tradingFrequencyPreference: profile.tradingFrequencyPreference || "",
      drawdownTolerance: profile.drawdownTolerance || "",
      adviceStyle: reverseAdviceStyle[profile.adviceStyle] || profile.adviceStyle,
      customPhilosophyText: profile.customPhilosophyText || "",
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const result = await validateBody(request, investorProfileUpdateSchema);
    if ("error" in result) return result.error;

    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return createErrorResponse({ code: "NOT_FOUND", message: "成员不存在" }, 404);
    }

    const data = result.data;

    // Map Chinese values to enums
    const profileData: Record<string, unknown> = {};
    if (data.riskPreference !== undefined) {
      profileData.riskPreference = riskPreferenceMap[data.riskPreference] || "BALANCED";
    }
    if (data.investmentHorizon !== undefined) {
      profileData.investmentHorizon = horizonMap[data.investmentHorizon] || "LONG";
    }
    if (data.primaryGoal !== undefined) profileData.primaryGoal = data.primaryGoal;
    if (data.maxSingleAssetWeight !== undefined) profileData.maxSingleAssetWeight = data.maxSingleAssetWeight;
    if (data.maxIndustryWeight !== undefined) profileData.maxIndustryWeight = data.maxIndustryWeight;
    if (data.minCashReserveMonths !== undefined) profileData.minCashReserveMonths = data.minCashReserveMonths;
    if (data.preferredAssets !== undefined) profileData.preferredAssets = data.preferredAssets;
    if (data.avoidedAssetsOrBehaviors !== undefined) profileData.avoidedAssetsOrBehaviors = data.avoidedAssetsOrBehaviors;
    if (data.tradingFrequencyPreference !== undefined) profileData.tradingFrequencyPreference = data.tradingFrequencyPreference;
    if (data.drawdownTolerance !== undefined) profileData.drawdownTolerance = data.drawdownTolerance;
    if (data.adviceStyle !== undefined) {
      profileData.adviceStyle = adviceStyleMap[data.adviceStyle] || "BALANCED";
    }
    if (data.customPhilosophyText !== undefined) profileData.customPhilosophyText = data.customPhilosophyText;

    const upserted = await prisma.investorProfile.upsert({
      where: { memberId },
      create: {
        memberId,
        ...profileData as any,
      },
      update: profileData as any,
    });

    return createSuccessResponse({ id: upserted.id, memberId: upserted.memberId });
  } catch (err) {
    return handleApiError(err);
  }
}
