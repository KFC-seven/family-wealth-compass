import { Card, CardContent } from "@/components/ui/card";
import { MoneyText } from "@/components/financial/MoneyText";
import { ReturnBadge } from "@/components/financial/ReturnBadge";
import { MetricCard } from "@/components/financial/MetricCard";
import { formatSignedMoney, formatPercent, formatCompactMoney } from "@/lib/format";

interface MemberSummaryCardProps {
  name: string;
  totalAssets: number;
  householdTotal?: number;
  todayReturn?: number;
  holdingReturn: number;
  holdingReturnRate: number | null;
  realizedReturn: number;
  cumulativeReturn: number;
  cumulativeReturnRate: number | null;
  cashBalance: number;
}

export function MemberSummaryCard({
  name, totalAssets, householdTotal, todayReturn,
  holdingReturn, holdingReturnRate, realizedReturn,
  cumulativeReturn, cumulativeReturnRate, cashBalance,
}: MemberSummaryCardProps) {
  const ratio = householdTotal && householdTotal > 0 ? (totalAssets / householdTotal) * 100 : undefined;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">成员 · {name}</p>
            <MoneyText value={totalAssets} size="2xl" />
            {ratio !== undefined && (
              <p className="text-xs text-muted-foreground">
                占家庭总资产 {ratio.toFixed(1)}% · 现金余额 {formatCompactMoney(cashBalance)}
              </p>
            )}
          </div>
        </div>

        {todayReturn !== undefined && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">今日收益</p>
            <ReturnBadge value={todayReturn} rate={null} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="持仓收益" value={formatSignedMoney(holdingReturn)}
            delta={<span className={holdingReturn >= 0 ? "text-positive" : "text-negative"}>{formatPercent(holdingReturnRate)}</span>} />
          <MetricCard label="已实现收益" value={formatSignedMoney(realizedReturn)} />
        </div>

        <div className="pt-3 border-t border-border">
          <MetricCard label="累计收益"
            value={<span className={cumulativeReturn >= 0 ? "text-positive" : "text-negative"}>{formatSignedMoney(cumulativeReturn)}</span>}
            delta={<span className={cumulativeReturn >= 0 ? "text-positive" : "text-negative"}>{formatPercent(cumulativeReturnRate)}</span>} />
        </div>
      </CardContent>
    </Card>
  );
}
