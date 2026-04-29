import { Card, CardContent } from "@/components/ui/card";
import { MoneyText } from "./MoneyText";
import { ReturnBadge } from "./ReturnBadge";
import { MetricCard } from "./MetricCard";
import { formatSignedMoney, formatPercent, formatCompactMoney } from "@/lib/format";

interface FinancialSummaryCardProps {
  scope: string;
  totalAssets: number;
  todayReturn?: number;
  holdingReturn: number;
  holdingReturnRate: number | null;
  realizedReturn: number;
  cumulativeReturn: number;
  cumulativeReturnRate: number | null;
  cashBalance?: number;
  className?: string;
}

export function FinancialSummaryCard({
  scope,
  totalAssets,
  todayReturn,
  holdingReturn,
  holdingReturnRate,
  realizedReturn,
  cumulativeReturn,
  cumulativeReturnRate,
  cashBalance,
  className,
}: FinancialSummaryCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{scope}总资产</p>
          <MoneyText value={totalAssets} size="2xl" />
          {cashBalance !== undefined && (
            <p className="text-xs text-muted-foreground">
              现金余额 {formatCompactMoney(cashBalance)}
            </p>
          )}
        </div>

        {todayReturn !== undefined && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">今日收益</p>
            <ReturnBadge value={todayReturn} rate={null} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="持仓收益"
            value={formatSignedMoney(holdingReturn)}
            delta={
              <span className={holdingReturn >= 0 ? "text-positive" : "text-negative"}>
                {formatPercent(holdingReturnRate)}
              </span>
            }
          />
          <MetricCard
            label="已实现收益"
            value={formatSignedMoney(realizedReturn)}
          />
        </div>

        <div className="pt-3 border-t border-border">
          <MetricCard
            label="累计收益"
            value={
              <span className={cumulativeReturn >= 0 ? "text-positive" : "text-negative"}>
                {formatSignedMoney(cumulativeReturn)}
              </span>
            }
            delta={
              <span className={cumulativeReturn >= 0 ? "text-positive" : "text-negative"}>
                {formatPercent(cumulativeReturnRate)}
              </span>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
