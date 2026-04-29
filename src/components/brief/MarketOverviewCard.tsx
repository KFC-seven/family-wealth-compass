import { MarketOverviewItem, MarketDirection, ImportanceLevel } from "@/types/brief";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus, Activity } from "lucide-react";

const directionIcons: Record<MarketDirection, React.ReactNode> = {
  positive: <ArrowUpRight className="w-4 h-4" />,
  negative: <ArrowDownRight className="w-4 h-4" />,
  neutral: <Minus className="w-4 h-4" />,
  volatile: <Activity className="w-4 h-4" />,
};
const directionColors: Record<MarketDirection, string> = {
  positive: "text-positive bg-red-50 dark:bg-red-950/30",
  negative: "text-negative bg-green-50 dark:bg-green-950/30",
  neutral: "text-muted-foreground bg-muted",
  volatile: "text-warning bg-amber-50 dark:bg-amber-950/30",
};

export function MarketOverviewCard({ item }: { item: MarketOverviewItem }) {
  return (
    <div className="p-4 rounded-xl border border-border space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{item.market}</p>
        <div className="flex items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", directionColors[item.direction])}>
            {directionIcons[item.direction]}
            {item.direction === "positive" ? "偏积极" : item.direction === "negative" ? "偏负面" : item.direction === "volatile" ? "波动加大" : "中性"}
          </span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded", item.importance === "high" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            {item.importance === "high" ? "重要" : item.importance === "medium" ? "一般" : "参考"}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
      <div className="flex gap-1.5">
        {item.affectedAssetTypes.map((t) => (
          <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{t}</span>
        ))}
      </div>
    </div>
  );
}
