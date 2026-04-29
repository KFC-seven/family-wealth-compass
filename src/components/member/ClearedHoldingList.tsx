import { cn } from "@/lib/utils";
import { formatSignedMoney, formatPercent, formatMoney } from "@/lib/format";
import { ASSET_TYPE_LABELS } from "@/types/finance";
import { EmptyState } from "@/components/financial/GeneralBadges";
import type { Holding } from "@/types/finance";

interface ClearedHoldingListProps {
  holdings: Holding[];
}

export function ClearedHoldingList({ holdings }: ClearedHoldingListProps) {
  if (holdings.length === 0) return <EmptyState message="暂无已清仓标的" />;

  return (
    <div className="space-y-2">
      {holdings.map((h) => (
        <div key={h.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{h.assetName}</p>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{ASSET_TYPE_LABELS[h.assetType]}</span>
              <span className="text-[10px] text-neutral border border-border px-1.5 py-0.5 rounded">已清仓</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              累计投入 {formatMoney(h.costBasis + Math.abs(h.cumulativeReturn - h.realizedReturn))}
            </p>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <p className={cn("text-sm font-medium tabular-nums", h.realizedReturn >= 0 ? "text-positive" : "text-negative")}>
              {formatSignedMoney(h.realizedReturn)}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">{formatPercent(h.cumulativeReturnRate)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
