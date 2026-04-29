import { Card, CardContent } from "@/components/ui/card";
import { MoneyText } from "@/components/financial/MoneyText";
import { ReturnBadge } from "@/components/financial/ReturnBadge";
import { MetricCard } from "@/components/financial/MetricCard";
import { AssetTypeBadge } from "@/components/financial/GeneralBadges";
import { formatSignedMoney, formatPercent, formatCompactMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Holding } from "@/types/finance";

interface PositionSummaryCardProps {
  holding: Holding;
  memberName: string;
  memberWeight?: number;
  householdWeight?: number;
}

export function PositionSummaryCard({ holding, memberName, memberWeight, householdWeight }: PositionSummaryCardProps) {
  const isCleared = holding.isCleared;
  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{holding.assetName}</h2>
              <AssetTypeBadge type={holding.assetType} />
            </div>
            <p className="text-sm text-muted-foreground">
              {memberName} · {holding.accountId.replace("acc-", "账户")}
              {isCleared && <span className="ml-2 text-neutral border border-border px-1.5 py-0.5 rounded text-[10px]">已清仓</span>}
            </p>
          </div>
        </div>

        {!isCleared && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">当前市值</p>
            <MoneyText value={holding.marketValue} size="2xl" />
            <p className="text-xs text-muted-foreground">
              {holding.quantity} 份 × {formatCompactMoney(holding.currentPrice)}
              {holding.riskTag && <span className="ml-2 text-warning">· {holding.riskTag}</span>}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {!isCleared && (
            <>
              <MetricCard label="持仓收益" value={
                <span className={holding.holdingReturn >= 0 ? "text-positive" : "text-negative"}>{formatSignedMoney(holding.holdingReturn)}</span>
              } delta={holding.holdingReturnRate !== null ? (
                <span className={holding.holdingReturn >= 0 ? "text-positive" : "text-negative"}>{formatPercent(holding.holdingReturnRate)}</span>
              ) : undefined} />
              <MetricCard label="剩余持仓成本" value={formatSignedMoney(holding.costBasis)} />
            </>
          )}
          <MetricCard label="已实现收益" value={
            <span className={holding.realizedReturn >= 0 ? "text-positive" : "text-negative"}>{formatSignedMoney(holding.realizedReturn)}</span>
          } />
          <MetricCard label="累计收益" value={
            <span className={holding.cumulativeReturn >= 0 ? "text-positive" : "text-negative"}>{formatSignedMoney(holding.cumulativeReturn)}</span>
          } delta={
            <span className={cn(holding.cumulativeReturn >= 0 ? "text-positive" : "text-negative")}>{formatPercent(holding.cumulativeReturnRate)}</span>
          } />
        </div>

        {(memberWeight !== undefined || householdWeight !== undefined) && (
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border text-xs">
            {memberWeight !== undefined && (
              <div>
                <p className="text-muted-foreground">成员内权重</p>
                <p className="font-medium tabular-nums">{(memberWeight * 100).toFixed(1)}%</p>
              </div>
            )}
            {householdWeight !== undefined && (
              <div>
                <p className="text-muted-foreground">家庭内权重</p>
                <p className="font-medium tabular-nums">{(householdWeight * 100).toFixed(1)}%</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
