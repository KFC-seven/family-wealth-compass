import { PageHeader } from "@/components/layout/PageHeader";
import { FinancialSummaryCard } from "@/components/financial/FinancialSummaryCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { AssetDrilldownChart } from "@/components/charts/AssetDrilldownChart";
import { MemberAllocationChart } from "@/components/charts/MemberAllocationChart";
import { ReturnTrendChart } from "@/components/charts/ReturnTrendChart";
import { AssetTrendChart } from "@/components/charts/AssetTrendChart";
import { HoldingRankList } from "@/components/financial/HoldingRankList";
import { RiskAlertCard } from "@/components/financial/RiskAlertCard";
import { DailyBriefPreviewCard } from "@/components/financial/DailyBriefPreviewCard";
import { CashBalanceCard } from "@/components/financial/CashBalanceCard";
import { getHousehold } from "@/lib/data-source";
import { ASSET_TYPE_LABELS, AssetType } from "@/types/finance";

const ASSET_COLORS: Record<string, string> = {
  cash: "#6b7280", aShare: "#b91c1c", usStock: "#2563eb",
  etf: "#4f46e5", mutualFund: "#7c3aed", bankWealth: "#0891b2", gold: "#d97706",
};

export default async function Home() {
  const {
    household,
    dailyReturns,
    monthlyAssets,
    memberAllocation,
    riskAlerts,
    topGainers,
    topLosers,
    briefPreview,
  } = await getHousehold();

  // Compute household-level drilldown data from asset allocation
  const assetAllocationData = household.members.length > 0
    ? memberAllocation
    : [];

  const currentHoldings = household.members.flatMap((m) => m.holdings.filter((h) => !h.isCleared));
  const typeMap: Record<string, { name: string; value: number }[]> = {};
  currentHoldings.forEach((h) => {
    if (!typeMap[h.assetType]) typeMap[h.assetType] = [];
    typeMap[h.assetType].push({ name: h.assetName, value: h.marketValue });
  });
  const householdTypeLevel = Object.entries(typeMap).map(([type, items]) => ({
    name: ASSET_TYPE_LABELS[type as AssetType] || type,
    value: items.reduce((s, i) => s + i.value, 0),
    color: ASSET_COLORS[type] || "#86868b",
    type: type as AssetType,
  }));
  const HOLDING_COLORS = ["#0071e3", "#5856d6", "#34c759", "#ff9f0a", "#ff453a", "#bf5af2", "#64d2ff", "#30d158"];
  const householdHoldingLevel: Record<string, { name: string; value: number; color: string }[]> = {};
  Object.entries(typeMap).forEach(([type, items]) => {
    householdHoldingLevel[type] = items.map((item, i) => ({
      name: item.name,
      value: item.value,
      color: HOLDING_COLORS[i % HOLDING_COLORS.length],
    }));
  });

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="总览"
        subtitle={new Date().toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}
      />

      {/* Financial Summary */}
      <FinancialSummaryCard
        scope="家庭"
        totalAssets={household.totalAssets}
        todayReturn={household.todayReturn}
        holdingReturn={household.holdingReturn}
        holdingReturnRate={household.holdingReturnRate}
        realizedReturn={household.realizedReturn}
        cumulativeReturn={household.cumulativeReturn}
        cumulativeReturnRate={household.cumulativeReturnRate}
        cashBalance={household.cashBalance}
      />

      {/* Daily Brief & Cash */}
      <div className="grid gap-4 sm:grid-cols-2">
        <DailyBriefPreviewCard brief={briefPreview} />
        <CashBalanceCard cashBalance={household.cashBalance} totalAssets={household.totalAssets} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="资产类别分布" subtitle="点击类别下钻查看具体持仓">
          <AssetDrilldownChart typeLevel={householdTypeLevel} holdingLevel={householdHoldingLevel} />
        </ChartCard>
        <ChartCard title="成员资产占比">
          <MemberAllocationChart data={memberAllocation} />
        </ChartCard>
      </div>

      {/* Trend Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="近30天收益趋势" subtitle="每日收益变化">
          <ReturnTrendChart data={dailyReturns} />
        </ChartCard>
        <ChartCard title="近12个月资产变化" subtitle="月度总资产走势">
          <AssetTrendChart data={monthlyAssets} />
        </ChartCard>
      </div>

      {/* Rankings */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="盈利排行" subtitle="累计收益 TOP 5">
          <HoldingRankList data={topGainers} type="gain" />
        </ChartCard>
        <ChartCard title="亏损排行" subtitle="累计亏损 TOP 3">
          <HoldingRankList data={topLosers} type="loss" />
        </ChartCard>
      </div>

      {/* Risk Alerts */}
      <ChartCard title="风险提醒" subtitle="需要关注的持仓和配置问题">
        <RiskAlertCard alerts={riskAlerts} />
      </ChartCard>
    </div>
  );
}
