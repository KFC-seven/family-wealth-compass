import { prisma } from "@/server/db/prisma";
import { decimalToNumber } from "@/server/finance/mappers";
import { fetchFinancialNews } from "@/server/news/fetch-news";
import type { BriefContext } from "./types";

export async function buildBriefContext(date: string): Promise<BriefContext> {
  const household = await prisma.household.findFirst();
  if (!household) throw new Error("无 Household 数据");

  const members = await prisma.member.findMany({
    where: { isActive: true },
    include: {
      holdings: { where: { status: "CURRENT" }, include: { asset: true } },
      investorProfile: true,
    },
  });

  let totalAssets = 0;
  let holdingReturn = 0;
  let realizedReturn = 0;
  let cumulativeReturn = 0;
  let cashBalance = 0;

  // Today's snapshot for dailyReturn
  const todaySnapshot = await prisma.portfolioSnapshot.findFirst({
    where: { householdId: household.id, scopeType: "HOUSEHOLD" },
    orderBy: { date: "desc" },
  });

  const dailyReturn = todaySnapshot ? decimalToNumber(todaySnapshot.dailyReturn) : 0;
  if (todaySnapshot) {
    totalAssets = decimalToNumber(todaySnapshot.totalAssets);
    cashBalance = decimalToNumber(todaySnapshot.cashBalance);
    holdingReturn = decimalToNumber(todaySnapshot.holdingReturn);
    realizedReturn = decimalToNumber(todaySnapshot.realizedReturn);
    cumulativeReturn = decimalToNumber(todaySnapshot.cumulativeReturn);
  }

  const totalHoldingMv = members.reduce((s, m) => {
    return s + m.holdings.reduce((hs, h) => hs + decimalToNumber(h.currentMarketValue), 0);
  }, 0);

  if (totalAssets === 0) totalAssets = totalHoldingMv + cashBalance;

  const memberData = members.map((m) => {
    const mHoldings = m.holdings.map((h) => {
      const mv = decimalToNumber(h.currentMarketValue);
      return {
        name: h.asset.name,
        type: h.asset.type,
        marketValue: mv,
        holdingReturn: decimalToNumber(h.holdingReturn),
        cumulativeReturn: decimalToNumber(h.cumulativeReturn),
        weight: totalHoldingMv > 0 ? mv / totalHoldingMv : 0,
      };
    });

    const mTotalAssets = mHoldings.reduce((s, h) => s + h.marketValue, 0);
    const mHoldingReturn = m.holdings.reduce((s, h) => s + decimalToNumber(h.holdingReturn), 0);
    const mCumulativeReturn = m.holdings.reduce((s, h) => s + decimalToNumber(h.cumulativeReturn), 0);

    return {
      name: m.name,
      role: m.roleLabel ?? "成员",
      totalAssets: mTotalAssets,
      dailyReturn: 0,  // 日收益无法按成员简单均分，由 AI 从持仓变化自行推断
      cumulativeReturn: mCumulativeReturn,
      holdings: mHoldings,
      philosophy: m.investorProfile?.customPhilosophyText ?? "未配置投资理念",
      riskPreference: m.investorProfile?.riskPreference ?? "BALANCED",
    };
  });

  // Risk rules
  const riskSignals = generateRiskSignals(memberData, totalHoldingMv, cashBalance, totalAssets);

  // News — 从新浪财经抓取滚动新闻
  const newsHighlights = await fetchFinancialNews();

  return {
    householdName: household.name,
    baseCurrency: household.baseCurrency,
    date,
    totalAssets,
    dailyReturn,
    cumulativeReturn,
    holdingReturn,
    realizedReturn,
    cashBalance,
    members: memberData,
    riskSignals,
    newsHighlights,
    marketSummary: "",  // 让 AI 基于持仓和行情数据自行生成
  };
}

function generateRiskSignals(members: BriefContext["members"], totalMv: number, cash: number, totalAssets: number) {
  const signals: BriefContext["riskSignals"] = [];

  for (const m of members) {
    for (const h of m.holdings) {
      if (h.weight > 0.3) {
        signals.push({ level: "high", type: "仓位集中", member: m.name, description: `${h.name} 单一持仓权重 ${(h.weight * 100).toFixed(1)}%，超过30%阈值`, asset: h.name });
      }
    }
  }

  const cashRatio = totalAssets > 0 ? cash / totalAssets : 0;
  if (cashRatio < 0.05) {
    signals.push({ level: "medium", type: "现金不足", member: "家庭", description: `现金占比 ${(cashRatio * 100).toFixed(1)}%，低于5%建议最低线` });
  }

  return signals;
}
