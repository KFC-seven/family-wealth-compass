import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExportButton } from "@/components/ui/ExportButton";
import { MemberSummaryCard } from "@/components/member/MemberSummaryCard";
import { AccountCard } from "@/components/member/AccountCard";
import { ClearedHoldingList } from "@/components/member/ClearedHoldingList";
import { TransactionTable } from "@/components/member/TransactionTable";
import { InvestorPhilosophyCard } from "@/components/member/InvestorPhilosophyCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { CurrentHoldingsClient } from "@/components/member/CurrentHoldingsClient";
import { AssetAllocationChart } from "@/components/charts/AssetAllocationChart";
import { MemberReturnTrendChart } from "@/components/charts/MemberReturnTrendChart";
import { MemberAssetTrendChart } from "@/components/charts/MemberAssetTrendChart";
import { getMemberById, getHousehold, getMemberTrends, getMemberTransactions } from "@/lib/data-source";
import { AssetAllocation, AssetType } from "@/types/finance";

interface Props {
  params: Promise<{ memberId: string }>;
}

export default async function MemberDetailPage({ params }: Props) {
  const { memberId } = await params;
  const [data, { household }, trends, memberTransactions] = await Promise.all([
    getMemberById(memberId),
    getHousehold(),
    getMemberTrends(memberId),
    getMemberTransactions(memberId),
  ]);

  const { member, currentHoldings, clearedHoldings, philosophy } = data;
  if (!member) notFound();

  const dailyReturns = trends.dailyReturns;
  const monthlyAssets = trends.monthlyAssets;

  // Build account summaries
  const accountSummaries = member.accounts.map((acc, i) => {
    const accHoldings = currentHoldings.filter((h) => h.accountId === acc.id);
    const accHoldingReturn = accHoldings.reduce((s, h) => s + h.holdingReturn, 0);
    const accRealizedReturn = accHoldings.reduce((s, h) => s + h.realizedReturn, 0);
    const accCumulativeReturn = accHoldings.reduce((s, h) => s + h.cumulativeReturn, 0);
    return {
      id: acc.id,
      name: acc.name,
      platform: acc.platform,
      cashBalance: 0,
      totalValue: accHoldings.reduce((s, h) => s + h.marketValue, 0),
      holdingReturn: accHoldingReturn,
      realizedReturn: accRealizedReturn,
      cumulativeReturn: accCumulativeReturn,
      holdingCount: accHoldings.length,
    };
  });

  // Build member-level asset allocation
  const typeValueMap: Record<string, number> = {};
  currentHoldings.forEach((h) => {
    typeValueMap[h.assetType] = (typeValueMap[h.assetType] || 0) + h.marketValue;
  });
  typeValueMap["cash"] = (typeValueMap["cash"] || 0) + member.cashBalance;
  const memberAllocation: AssetAllocation[] = Object.entries(typeValueMap)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      type: type as AssetType,
      value,
      percentage: member.totalAssets > 0 ? value / member.totalAssets : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <PageHeader title={member.name} subtitle="成员详情" />
        <div className="ml-auto">
          <ExportButton memberId={member.id} label="导出 Excel" />
        </div>
      </div>

      <MemberSummaryCard
        name={member.name}
        totalAssets={member.totalAssets}
        householdTotal={household.totalAssets}
        todayReturn={dailyReturns.length > 0 ? dailyReturns[dailyReturns.length - 1].value : undefined}
        holdingReturn={member.holdingReturn}
        holdingReturnRate={member.cumulativeReturnRate}
        realizedReturn={member.realizedReturn}
        cumulativeReturn={member.cumulativeReturn}
        cumulativeReturnRate={member.cumulativeReturnRate}
        cashBalance={member.cashBalance}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="资产类别分布">
          <AssetAllocationChart data={memberAllocation} />
        </ChartCard>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">账户列表</h3>
          {accountSummaries.map((acc, i) => (
            <AccountCard key={acc.id} account={{ ...acc, id: member.accounts[i]?.id || acc.id }} />
          ))}
        </div>
      </div>

      <ChartCard title="当前持仓" subtitle={`共 ${currentHoldings.length} 个持仓`}>
        <CurrentHoldingsClient holdings={currentHoldings} memberId={memberId} />
      </ChartCard>

      {clearedHoldings.length > 0 && (
        <ChartCard title="已清仓标的" subtitle={`共 ${clearedHoldings.length} 个`}>
          <ClearedHoldingList holdings={clearedHoldings} />
        </ChartCard>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="近30天收益趋势">
          <MemberReturnTrendChart data={dailyReturns} />
        </ChartCard>
        <ChartCard title="近12个月资产变化">
          <MemberAssetTrendChart data={monthlyAssets} />
        </ChartCard>
      </div>

      <ChartCard title="最近交易记录" subtitle={`近 20 条`}>
        <TransactionTable transactions={memberTransactions} />
      </ChartCard>

      {philosophy && <InvestorPhilosophyCard philosophy={philosophy} />}
    </div>
  );
}
