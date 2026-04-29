import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MemberSummaryCard } from "@/components/member/MemberSummaryCard";
import { AccountCard } from "@/components/member/AccountCard";
import { HoldingListItem } from "@/components/member/HoldingListItem";
import { ClearedHoldingList } from "@/components/member/ClearedHoldingList";
import { TransactionTable } from "@/components/member/TransactionTable";
import { InvestorPhilosophyCard } from "@/components/member/InvestorPhilosophyCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { AssetAllocationChart } from "@/components/charts/AssetAllocationChart";
import { MemberReturnTrendChart } from "@/components/charts/MemberReturnTrendChart";
import { MemberAssetTrendChart } from "@/components/charts/MemberAssetTrendChart";
import { mockMembers } from "@/data/mock-members";
import { mockHoldings } from "@/data/mock-holdings";
import { mockTransactions } from "@/data/mock-transactions";
import { mockHousehold, mockAssetAllocation } from "@/data/mock-household";
import { mockPhilosophies } from "@/data/mock-philosophy";
import { memberDailyReturnsMap, memberMonthlyAssetsMap } from "@/data/mock-member-trends";
import { calculateMemberSummary, calculateAccountSummary } from "@/lib/returns";
import { AssetAllocation, AssetType } from "@/types/finance";

interface Props {
  params: Promise<{ memberId: string }>;
}

export default async function MemberDetailPage({ params }: Props) {
  const { memberId } = await params;
  const member = mockMembers.find((m) => m.id === memberId);
  if (!member) notFound();

  const memberHoldings = mockHoldings.filter((h) => h.memberId === memberId);
  const currentHoldings = memberHoldings.filter((h) => !h.isCleared);
  const clearedHoldings = memberHoldings.filter((h) => h.isCleared);
  const memberTransactions = mockTransactions
    .filter((t) => t.memberId === memberId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const philosophy = mockPhilosophies.find((p) => p.memberId === memberId);
  const summary = calculateMemberSummary(memberHoldings, member.cashBalance);
  const dailyReturns = memberDailyReturnsMap[memberId] || [];
  const monthlyAssets = memberMonthlyAssetsMap[memberId] || [];

  // Build account summaries with ids
  const accountSummaries = member.accounts.map((acc) => {
    const accHoldings = currentHoldings.filter((h) => h.accountId === acc.id);
    const summary = calculateAccountSummary(accHoldings, acc.cashBalance);
    return { id: acc.id, name: acc.name, platform: acc.platform, cashBalance: acc.cashBalance, ...summary };
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
      percentage: summary.totalAssets > 0 ? value / summary.totalAssets : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <PageHeader title={member.name} subtitle="成员详情" />
      </div>

      <MemberSummaryCard
        name={member.name}
        totalAssets={summary.totalAssets}
        householdTotal={mockHousehold.totalAssets}
        todayReturn={dailyReturns.length > 0 ? dailyReturns[dailyReturns.length - 1].value : undefined}
        holdingReturn={summary.holdingReturn}
        holdingReturnRate={member.cumulativeReturnRate}
        realizedReturn={summary.realizedReturn}
        cumulativeReturn={summary.cumulativeReturn}
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
        {currentHoldings.length > 0 ? (
          <div className="space-y-2">
            {currentHoldings.map((h) => (
              <HoldingListItem key={h.id} holding={h} memberId={memberId} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">暂无持仓</div>
        )}
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
