import { prisma } from "@/server/db/prisma";
import { getAiProvider } from "@/server/ai/registry";
import { dailyBriefAiOutputSchema } from "@/server/ai/output-schema";
import { checkSafety } from "@/server/ai/safety";
import { buildBriefContext } from "./context-builder";
import type { GenerateBriefOptions } from "./types";
import type { AiBriefOutput } from "@/server/ai/types";

export async function generateDailyBrief(options: GenerateBriefOptions = {}) {
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const household = await prisma.household.findFirst();
  if (!household) throw new Error("无 Household");

  const dateObj = new Date(date);

  // 检查是否已生成
  const existing = await prisma.dailyBrief.findFirst({
    where: {
      householdId: household.id,
      date: {
        gte: new Date(date + "T00:00:00.000Z"),
        lt: new Date(date + "T23:59:59.999Z"),
      },
    },
  });

  if (existing && existing.status === "GENERATED" && !options.force) {
    console.log(`[Brief] ${date} 已有简报，跳过 (force=false)`);
    return existing;
  }

  // 1. Build context
  const context = await buildBriefContext(date);

  // 2. Call AI provider
  const ai = getAiProvider();
  const aiRun = await prisma.aiGenerationRun.create({
    data: {
      householdId: household.id,
      provider: (ai.name.toUpperCase() as any),
      model: process.env.AI_MODEL ?? "mock",
      status: "RUNNING",
      startedAt: new Date(),
      inputHash: date,
    },
  });

  let output: AiBriefOutput;
  let aiFailed = false;
  const startedAt = Date.now();

  try {
    output = await ai.generateStructuredBrief(context);
    const validated = dailyBriefAiOutputSchema.parse(output);
    output = validated as AiBriefOutput;

    // Safety check
    const safety = checkSafety(output);
    if (!safety.passed) {
      console.warn(`[Brief] 安全检查未通过: ${safety.issues.join("; ")}`);
      if (safety.issues.some((i) => i.includes("禁止词"))) {
        throw new Error(`安全检查失败: ${safety.issues.join("; ")}`);
      }
    }
  } catch (err) {
    console.error(`[Brief] AI 生成失败: ${(err as Error).message.slice(0, 200)}`);
    // Fallback to Mock AI
    try {
      const { MockAiProvider } = await import("../ai/providers/mock-ai-provider");
      const mock = new MockAiProvider();
      output = await mock.generateStructuredBrief(context);
      output = dailyBriefAiOutputSchema.parse(output) as AiBriefOutput;
      // Safety check for mock fallback
      const mockSafety = checkSafety(output);
      if (!mockSafety.passed) {
        console.warn(`[Brief] Mock AI fallback 安全检查: ${mockSafety.issues.join("; ")}`);
      }
      console.log(`[Brief] Fallback 到 Mock AI 成功`);
    } catch (mockErr) {
      console.error(`[Brief] Mock fallback 也失败: ${(mockErr as Error).message}`);
      await prisma.aiGenerationRun.update({
        where: { id: aiRun.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt,
          errorMessage: (err as Error).message.slice(0, 500),
        },
      });
      throw err;
    }
  }

  await prisma.aiGenerationRun.update({
    where: { id: aiRun.id },
    data: {
      status: "SUCCESS",
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt,
      outputHash: JSON.stringify(output).slice(0, 1000),
    },
  });

  // 3. Persist
  const brief = await prisma.dailyBrief.upsert({
    where: {
      householdId_date: {
        householdId: household.id,
        date: dateObj,
      },
    },
    update: {
      status: "GENERATED",
      generatedAt: new Date(),
      title: output.title,
      summary: output.summary,
      householdImpact: output.householdImpact as any,
      marketOverview: output.marketOverview as any,
      memberImpacts: output.memberImpacts as any,
      riskAlerts: output.riskAlerts as any,
      adviceCards: output.adviceCards as any,
      newsItems: output.newsItems as any,
    },
    create: {
      householdId: household.id,
      date: dateObj,
      status: "GENERATED",
      generatedAt: new Date(),
      title: output.title,
      summary: output.summary,
      householdImpact: output.householdImpact as any,
      marketOverview: output.marketOverview as any,
      memberImpacts: output.memberImpacts as any,
      riskAlerts: output.riskAlerts as any,
      adviceCards: output.adviceCards as any,
      newsItems: output.newsItems as any,
    },
  });

  // Link AiGenerationRun to brief
  await prisma.aiGenerationRun.update({
    where: { id: aiRun.id },
    data: { briefId: brief.id },
  });

  return brief;
}
