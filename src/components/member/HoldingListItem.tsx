import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSignedMoney, formatPercent, formatMoney } from "@/lib/format";
import { formatAssetType } from "@/types/finance";
import { AssetTypeBadge } from "@/components/financial/GeneralBadges";
import type { Holding } from "@/types/finance";

interface HoldingListItemProps {
  holding: Holding;
  memberId: string;
}

export function HoldingListItem({ holding, memberId }: HoldingListItemProps) {
  return (
    <Link
      href={`/holdings/${holding.id}`}
      className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{holding.assetName}</p>
          <AssetTypeBadge type={holding.assetType} />
          {holding.riskTag && !holding.isCleared && (
            <span className="text-[10px] text-warning bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">{holding.riskTag}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{formatAssetType(holding.assetType)}</span>
          <span>市值 {formatMoney(holding.marketValue)}</span>
          <span>成本 {formatMoney(holding.costBasis)}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-4">
        <p className={cn("text-sm font-medium tabular-nums", holding.cumulativeReturn >= 0 ? "text-positive" : "text-negative")}>
          {formatSignedMoney(holding.cumulativeReturn)}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">{formatPercent(holding.cumulativeReturnRate)}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground ml-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
