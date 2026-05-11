import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditHoldingButton } from "@/components/position/EditHoldingForm";
import { ChartCard } from "@/components/charts/ChartCard";
import { PositionSummaryCard } from "@/components/position/PositionSummaryCard";
import { PositionPriceChart } from "@/components/position/PositionPriceChart";
import { PositionLifecycleTable } from "@/components/position/PositionLifecycleTable";
import { PositionReturnBreakdown } from "@/components/position/PositionReturnBreakdown";
import { PositionNewsCard } from "@/components/position/PositionNewsCard";
import { PositionAdviceCard } from "@/components/position/PositionAdviceCard";
import { AssetTrendChart } from "@/components/charts/AssetTrendChart";
import { getHoldingsData, getHousehold, getHoldingTransactions, getHoldingPriceHistory } from "@/lib/data-source";
import { mockPositionNews } from "@/data/mock-news";
import { mockPositionAdvice } from "@/data/mock-news";
import { calculateReturnBreakdown } from "@/lib/returns";
import type { Transaction, TransactionType } from "@/types/finance";

interface Props {
  params: Promise<{ holdingId: string }>;
}

export default async function PositionDetailPage({ params }: Props) {
  const { holdingId } = await params;

  const [holdingsData, { household }, priceHistoryData, rawTransactions] = await Promise.all([
    getHoldingsData(),
    getHousehold(),
    getHoldingPriceHistory(holdingId),
    getHoldingTransactions(holdingId),
  ]);

  const allHoldings = [...holdingsData.currentHoldings, ...holdingsData.clearedHoldings];
  const holding = allHoldings.find((h) => h.id === holdingId);
  if (!holding) notFound();

  const member = holdingsData.members.find((m) => m.id === holding.memberId);
  const memberHoldings = holdingsData.currentHoldings.filter((h) => h.memberId === holding.memberId);
  const memberTotalValue = memberHoldings.reduce((s, h) => s + h.marketValue, 0) + (member?.cashBalance || 0);
  const memberWeight = memberTotalValue > 0 ? holding.marketValue / memberTotalValue : 0;
  const householdWeight = household.totalAssets > 0 ? holding.marketValue / household.totalAssets : 0;

  // Map API transactions to frontend Transaction type
  // getHoldingTransactions() returns data filtered by holdingId from DB, so all belong to this holding
  const positionTransactions: Transaction[] = (rawTransactions || []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    memberId: holding.memberId,
    accountId: holding.accountId,
    assetId: holding.assetId,
    type: t.type as TransactionType,
    date: (t.tradeDate as string).substring(0, 10),
    quantity: t.quantity as number | undefined,
    price: t.price as number | undefined,
    amount: t.grossAmount as number,
    fee: (t.fee as number) || undefined,
    tax: (t.tax as number) || undefined,
    note: t.note as string | undefined,
  })).sort((a, b) => a.date.localeCompare(b.date));

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

  // Build value trend data from price history (real or mock)
  const valueTrend = priceHistoryData?.prices.map((p) => ({
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
        <div className="ml-auto">
          <EditHoldingButton
            holdingId={holding.id}
            initial={{
              assetName: holding.assetName,
              quantity: holding.quantity,
              currentPrice: holding.currentPrice,
              marketValue: holding.marketValue,
              remainingCost: holding.costBasis,
              holdingReturn: holding.holdingReturn,
            }}
          />
        </div>
      </div>

      <PositionSummaryCard
        holding={holding}
        memberName={member?.name || ""}
        memberWeight={memberWeight}
        householdWeight={householdWeight}
      />

      <ChartCard title={`${holding.assetName} 价格走势`} subtitle="红色标记为买入点，绿色标记为卖出点">
        {priceHistoryData ? (
          <PositionPriceChart prices={priceHistoryData.prices} markers={priceHistoryData.markers} />
        ) : (
          <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">暂无价格数据</div>
        )}
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

      {/* 新闻和建议暂用 mock 数据 — 待未来接入新闻数据源和持仓级 AI 建议 */}
      {news.length > 0 && (
        <ChartCard title="相关消息" subtitle={`${news.length} 条相关内容`}>
          <PositionNewsCard news={news} />
        </ChartCard>
      )}

      {advice && <PositionAdviceCard advice={advice} />}
    </div>
  );
}
