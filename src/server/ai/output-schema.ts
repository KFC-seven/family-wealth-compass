import { z } from "zod";

export const adviceCardSchema = z.object({
  adviceType: z.enum([
    "CONTINUE_OBSERVING", "BATCH_ADD", "REDUCE_OBSERVE", "TAKE_PROFIT_REVIEW",
    "REDUCE_CONCENTRATION", "INCREASE_CASH", "NO_ACTION", "WAIT_FOR_CONFIRMATION",
  ]),
  relatedMember: z.string(),
  relatedHoldingId: z.string().nullish(),
  relatedAssetName: z.string(),
  reason: z.string().min(1),
  riskLevel: z.enum(["low", "medium", "high"]),
  triggerCondition: z.string().min(1),
  uncertainty: z.string().min(1),
  philosophyMatch: z.string().min(1),
  observationPeriod: z.string().optional(),
  actionIntensity: z.enum(["light", "moderate", "significant"]).optional(),
});

export const dailyBriefAiOutputSchema = z.object({
  title: z.string().min(1).max(100),
  summary: z.string().min(1).max(500),
  marketOverview: z.array(z.object({
    market: z.string(),
    direction: z.enum(["positive", "negative", "neutral", "mixed"]),
    summary: z.string(),
  })),
  householdImpact: z.object({
    direction: z.enum(["positive", "negative", "neutral", "mixed"]),
    summary: z.string(),
    mainContributors: z.array(z.string()),
    mainRisks: z.array(z.string()),
  }),
  memberImpacts: z.array(z.object({
    memberName: z.string(),
    summary: z.string(),
    todayReturn: z.number(),
  })),
  riskAlerts: z.array(z.object({
    level: z.enum(["low", "medium", "high"]),
    type: z.string(),
    relatedMember: z.string(),
    description: z.string(),
    relatedAsset: z.string().optional(),
  })),
  adviceCards: z.array(adviceCardSchema),
  newsItems: z.array(z.object({
    title: z.string(),
    impact: z.enum(["positive", "negative", "neutral"]),
    importance: z.enum(["high", "medium", "low"]),
    summary: z.string(),
  })),
  disclaimer: z.string(),
});

export type DailyBriefAiOutput = z.infer<typeof dailyBriefAiOutputSchema>;
