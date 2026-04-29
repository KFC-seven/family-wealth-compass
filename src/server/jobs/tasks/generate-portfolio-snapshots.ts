import type { JobDefinition, JobContext, JobResult } from "../types";
import type { PortfolioSnapshotScope } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { decimalToNumber } from "@/server/finance/mappers";
import { registerJob } from "../registry";

/**
 * 为 HOUSEHOLD、MEMBER、HOLDING 生成当日 PortfolioSnapshot。
 * 支持指定日期参数，默认今天。
 */
export const generatePortfolioSnapshotsJob: JobDefinition = {
  name: "generate-portfolio-snapshots",
  displayName: "生成组合快照",
  description: "为家庭/成员/持仓生成当日 PortfolioSnapshot",
  async execute(ctx: JobContext): Promise<JobResult> {
    const dateStr = ctx.date ?? new Date().toISOString().slice(0, 10);
    const date = new Date(dateStr);

    const household = await prisma.household.findFirst();
    if (!household) {
      return {
        status: "SKIPPED",
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        metadata: { reason: "无 Household 数据" },
      };
    }

    let successCount = 0;
    let failureCount = 0;

    try {
      // 1. Household 级别快照
      await generateHouseholdSnapshot(household.id, date);
      successCount++;

      // 2. Member 级别快照
      const members = await prisma.member.findMany({
        where: { householdId: household.id, isActive: true },
      });
      for (const m of members) {
        try {
          await generateMemberSnapshot(household.id, m.id, date);
          successCount++;
        } catch (err) {
          console.error(`[generate-portfolio-snapshots] Member ${m.id} 快照失败:`, (err as Error).message);
          failureCount++;
        }
      }

      // 3. Holding 级别快照
      const holdings = await prisma.holding.findMany({
        where: { status: "CURRENT" },
      });
      for (const h of holdings) {
        try {
          await generateHoldingSnapshot(household.id, h.id, date);
          successCount++;
        } catch (err) {
          console.error(`[generate-portfolio-snapshots] Holding ${h.id} 快照失败:`, (err as Error).message);
          failureCount++;
        }
      }
    } catch (err) {
      console.error("[generate-portfolio-snapshots] 任务异常:", (err as Error).message);
      failureCount++;
    }

    if (failureCount > 0 && successCount === 0) {
      return {
        status: "FAILED",
        successCount: 0,
        failureCount,
        skippedCount: 0,
        errorMessage: "快照生成全部失败",
      };
    }

    if (failureCount > 0) {
      return {
        status: "PARTIAL",
        successCount,
        failureCount,
        skippedCount: 0,
      };
    }

    return { status: "SUCCESS", successCount, failureCount, skippedCount: 0 };
  },
};

async function generateHouseholdSnapshot(householdId: string, date: Date) {
  const members = await prisma.member.findMany({
    where: { householdId, isActive: true },
    include: {
      holdings: { where: { status: "CURRENT" } },
      accounts: { where: { isActive: true } },
    },
  });

  let totalAssets = 0;
  let cashBalance = 0;
  let holdingMarketValue = 0;
  let holdingReturn = 0;
  let realizedReturn = 0;
  let cumulativeReturn = 0;

  for (const m of members) {
    for (const h of m.holdings) {
      const mv = decimalToNumber(h.currentMarketValue);
      holdingMarketValue += mv;
      holdingReturn += decimalToNumber(h.holdingReturn);
      realizedReturn += decimalToNumber(h.realizedReturn);
      cumulativeReturn += decimalToNumber(h.cumulativeReturn);
      totalAssets += mv;
    }
    for (const a of m.accounts) {
      if (a.type === "CASH") {
        // 现金账户的总和
      }
    }
  }

  // 通过 transaction 汇总现金流
  const transactions = await prisma.transaction.findMany({
    where: { householdId },
    select: { type: true, netAmount: true, cashImpact: true },
  });

  for (const t of transactions) {
    if (t.type === "DEPOSIT" || t.type === "WITHDRAW") {
      const amt = decimalToNumber(t.cashImpact ?? t.netAmount);
      if (t.type === "DEPOSIT") cashBalance += amt;
      else cashBalance -= amt;
    }
  }

  // 通过 holding market value 计算 holding 的现金部分
  const cashHoldings = await prisma.holding.findMany({
    where: { status: "CURRENT", asset: { type: "CASH" } },
    select: { currentMarketValue: true },
  });
  for (const ch of cashHoldings) {
    cashBalance += decimalToNumber(ch.currentMarketValue);
  }

  totalAssets = holdingMarketValue + Math.max(0, cashBalance);

  // 查询前一日的 dailyReturn
  const prevSnapshot = await prisma.portfolioSnapshot.findFirst({
    where: { householdId, scopeType: "HOUSEHOLD", scopeId: null },
    orderBy: { date: "desc" },
  });

  let dailyReturn = 0;
  let externalNetFlow = 0;

  if (prevSnapshot) {
    const todayStart = new Date(date.toISOString().slice(0, 10) + "T00:00:00.000Z");
    const newTxs = await prisma.transaction.findMany({
      where: {
        householdId,
        tradeDate: { gte: todayStart },
        type: { in: ["DEPOSIT", "WITHDRAW"] },
      },
    });
    for (const t of newTxs) {
      const amt = decimalToNumber(t.cashImpact ?? t.netAmount);
      if (t.type === "DEPOSIT") externalNetFlow += amt;
      else externalNetFlow -= amt;
    }
    dailyReturn = totalAssets - decimalToNumber(prevSnapshot.totalAssets) - externalNetFlow;
  }

  const prevCumulative = decimalToNumber(prevSnapshot?.cumulativeReturn ?? 0);
  const newCumulative = prevCumulative + dailyReturn;

  await prisma.portfolioSnapshot.upsert({
    where: {
      id: `${householdId}_HOUSEHOLD_${date.toISOString().slice(0, 10)}`,
    },
    update: {
      totalAssets,
      cashBalance,
      holdingMarketValue,
      dailyReturn,
      cumulativeReturn: newCumulative,
      holdingReturn,
      realizedReturn,
      externalNetFlow,
    },
    create: {
      id: `${householdId}_HOUSEHOLD_${date.toISOString().slice(0, 10)}`,
      householdId,
      scopeType: "HOUSEHOLD",
      date,
      totalAssets,
      cashBalance,
      holdingMarketValue,
      dailyReturn,
      cumulativeReturn: newCumulative,
      holdingReturn,
      realizedReturn,
      externalNetFlow,
    },
  });
}

async function generateMemberSnapshot(householdId: string, memberId: string, date: Date) {
  const holdings = await prisma.holding.findMany({
    where: { memberId, status: "CURRENT" },
  });

  let holdingMarketValue = 0;
  let holdingReturn = 0;
  let realizedReturn = 0;
  let cumulativeReturn = 0;

  for (const h of holdings) {
    holdingMarketValue += decimalToNumber(h.currentMarketValue);
    holdingReturn += decimalToNumber(h.holdingReturn);
    realizedReturn += decimalToNumber(h.realizedReturn);
    cumulativeReturn += decimalToNumber(h.cumulativeReturn);
  }

  const totalAssets = holdingMarketValue;
  const id = `${memberId}_MEMBER_${date.toISOString().slice(0, 10)}`;

  await prisma.portfolioSnapshot.upsert({
    where: { id },
    update: {
      totalAssets,
      holdingMarketValue,
      holdingReturn,
      realizedReturn,
      cumulativeReturn,
    },
    create: {
      id,
      householdId,
      scopeType: "MEMBER",
      scopeId: memberId,
      date,
      totalAssets,
      holdingMarketValue,
      holdingReturn,
      realizedReturn,
      cumulativeReturn,
    },
  });
}

async function generateHoldingSnapshot(householdId: string, holdingId: string, date: Date) {
  const holding = await prisma.holding.findUnique({
    where: { id: holdingId },
  });
  if (!holding) return;

  const marketValue = decimalToNumber(holding.currentMarketValue);
  const holdingReturnVal = decimalToNumber(holding.holdingReturn);
  const realizedReturnVal = decimalToNumber(holding.realizedReturn);
  const cumulativeReturnVal = decimalToNumber(holding.cumulativeReturn);

  const id = `${holdingId}_HOLDING_${date.toISOString().slice(0, 10)}`;

  await prisma.portfolioSnapshot.upsert({
    where: { id },
    update: {
      totalAssets: marketValue,
      holdingMarketValue: marketValue,
      holdingReturn: holdingReturnVal,
      realizedReturn: realizedReturnVal,
      cumulativeReturn: cumulativeReturnVal,
    },
    create: {
      id,
      householdId,
      scopeType: "HOLDING",
      scopeId: holdingId,
      date,
      totalAssets: marketValue,
      holdingMarketValue: marketValue,
      holdingReturn: holdingReturnVal,
      realizedReturn: realizedReturnVal,
      cumulativeReturn: cumulativeReturnVal,
    },
  });
}

registerJob(generatePortfolioSnapshotsJob);
