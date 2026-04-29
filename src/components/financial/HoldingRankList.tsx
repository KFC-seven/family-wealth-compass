import Link from "next/link";
import { HoldingRankItem } from "@/types/finance";
import { ASSET_TYPE_LABELS } from "@/types/finance";
import { formatSignedMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const MEMBER_ROUTES: Record<string, string> = {
  "member-1": "/members/member-1",
  "member-2": "/members/member-2",
  "member-3": "/members/member-3",
};

const HOLDING_ROUTES: Record<string, string> = {
  "h-1": "/holdings/h-1", "h-2": "/holdings/h-2", "h-3": "/holdings/h-3",
  "h-4": "/holdings/h-4", "h-5": "/holdings/h-5", "h-6": "/holdings/h-6",
  "h-7": "/holdings/h-7", "h-8": "/holdings/h-8", "h-9": "/holdings/h-9",
  "h-10": "/holdings/h-10", "h-11": "/holdings/h-11", "h-12": "/holdings/h-12",
  "h-13": "/holdings/h-13", "h-14": "/holdings/h-14",
};

interface HoldingRankListProps {
  data: HoldingRankItem[];
  type: "gain" | "loss";
  className?: string;
}

export function HoldingRankList({ data, type, className }: HoldingRankListProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        {type === "gain" ? "暂无盈利持仓" : "暂无亏损持仓"}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((item, i) => {
        const holdingRoute = HOLDING_ROUTES[item.holdingId] || "/holdings/" + item.holdingId;
        const memberRoute = MEMBER_ROUTES[Object.keys(MEMBER_ROUTES).find((k) => MEMBER_ROUTES[k].includes(item.memberName)) || ""] || "#";
        return (
          <Link
            key={item.holdingId}
            href={holdingRoute}
            className="flex items-center justify-between hover:bg-muted/50 rounded-lg px-2 -mx-2 py-1.5 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.assetName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.memberName} · {ASSET_TYPE_LABELS[item.assetType]}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className={cn("text-sm font-medium tabular-nums", type === "gain" ? "text-positive" : "text-negative")}>
                {formatSignedMoney(item.return_value)}
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatPercent(item.returnRate)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
