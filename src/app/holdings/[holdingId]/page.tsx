import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import { PositionSummaryCard } from "@/components/position/PositionSummaryCard";
import { PositionPriceChart } from "@/components/position/PositionPriceChart";
import { PositionLifecycleTable } from "@/components/position/PositionLifecycleTable";
import { PositionReturnBreakdown } from "@/components/position/PositionReturnBreakdown";
import { PositionNewsCard } from "@/components/position/PositionNewsCard";
import { PositionAdviceCard } from "@/components/position/PositionAdviceCard";
import { AssetTrendChart } from "@/components/charts/AssetTrendChart";
import { getHoldingsData, getHousehold, getHoldingTransactions } from "@/lib/data-source";
import { mockTransactions } from "@/data/mock-transactions";
import { mockPriceHistory } from "@/data/mock-price-history";
import { mockPositionNews } from "@/data/mock-news";
import { mockPositionAdvice } from "@/data/mock-news";
import { calculateReturnBreakdown } from "@/lib/returns";

interface Props {
  params: Promise<{ holdingId: string }>;
}

export default async function PositionDetailPage({ params }: Props) {
  const { holdingId } = await params;

  const [holdingsData, { household }] = await Promise.all([
    getHoldingsData(),
    getHousehold(),
  ]);

  const allHoldings = [...holdingsData.currentHoldings, ...holdingsData.clearedHoldings];
  const holding = allHoldings.find((h) => h.id === holdingId);
  if (!holding) notFound();

  const member = holdingsData.members.find((m) => m.id === holding.memberId);
  const memberHoldings = holdingsData.currentHoldings.filter((h) => h.memberId === holding.memberId);
  const memberTotalValue = memberHoldings.reduce((s, h) => s + h.marketValue, 0) + (member?.cashBalance || 0);
  const memberWeight = memberTotalValue > 0 ? holding.marketValue / memberTotalValue : 0;
  const householdWeight = household.totalAssets > 0 ? holding.marketValue / household.totalAssets : 0;

  const priceData = mockPriceHistory[holdingId];
  const heldAssetId = holding.assetId;

  const positionTransactions = mockTransactions
    .filter((t) => t.memberId === holding.memberId && t.assetId === heldAssetId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const dividendsInterest = positionTransactions
    .filter((t) => t.type === "DIVIDEND" || t.type === "INTEREST")
    .reduce((s, t) => s + t.amount, 0);
  const feesTaxes = positionTransactions
    .filter((t) => t.type === "FEE")
    .reduce((s, t) => s + t.amount, 0);

  const breakdown = calculateReturnBreakdown(
    holding.holdingReturn,
    holding.realizedReturn,
    dividendsInterest,
    feesTaxes
  );

  const news = mockPositionNews[holdingId] || [];
  const advice = mockPositionAdvice[holdingId];
  const isCleared = holding.isCleared;

  // Build value trend data from price history
  const valueTrend = priceData?.prices.map((p) => ({
    month: p.date,
    value: p.price * holding.quantity,
  })) || [];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <Link href={`/members/${holding.memberId}`} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <PageHeader title={holding.assetName} subtitle="单仓详情" />
      </div>

      <PositionSummaryCard
        holding={holding}
        memberName={member?.name || ""}
        memberWeight={memberWeight}
        householdWeight={householdWeight}
      />

      <ChartCard title={`${holding.assetName} 价格走势`} subtitle="红色标记为买入点，绿色标记为卖出点">
        {priceData ? (
          <PositionPriceChart prices={priceData.prices} markers={priceData.markers} />
        ) : null}
      </ChartCard>

      {!isCleared && valueTrend.length > 0 && (
        <ChartCard title="持仓市值变化">
          <AssetTrendChart data={valueTrend} />
        </ChartCard>
      )}

      <ChartCard title="收益拆解">
        <PositionReturnBreakdown breakdown={breakdown} />
      </ChartCard>

      <ChartCard title="交易生命周期" subtitle={`共 ${positionTransactions.length} 条记录`}>
        <PositionLifecycleTable transactions={positionTransactions} holdingId={holdingId} />
      </ChartCard>

      {news.length > 0 && (
        <ChartCard title="相关消息" subtitle={`${news.length} 条相关内容`}>
          <PositionNewsCard news={news} />
        </ChartCard>
      )}

      {advice && <PositionAdviceCard advice={advice} />}
    </div>
  );
}
