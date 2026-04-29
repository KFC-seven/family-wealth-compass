import { BriefHistoryItem } from "@/types/brief";
import { formatSignedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CheckCircle2, X } from "lucide-react";

interface BriefHistoryListProps {
  items: BriefHistoryItem[];
  activeDate?: string;
  onSelect?: (date: string) => void;
}

export function BriefHistoryList({ items, activeDate, onSelect }: BriefHistoryListProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground mb-2">历史简报</p>
      {items.map((item) => (
        <button
          key={item.date}
          onClick={() => onSelect?.(item.date)}
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-xl border border-border text-xs transition-colors",
            activeDate === item.date ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.date}</span>
            <span className="text-muted-foreground">{item.generatedAt}</span>
          </div>
          <div className="flex items-center gap-3 tabular-nums">
            <span className={cn(item.todayReturn >= 0 ? "text-positive" : "text-negative")}>
              {formatSignedMoney(item.todayReturn)}
            </span>
            <span className="text-muted-foreground">{item.riskCount} 风险</span>
            <span className="text-muted-foreground">{item.adviceCount} 建议</span>
            {item.pushed ? <CheckCircle2 className="w-3 h-3 text-positive" /> : <X className="w-3 h-3 text-muted-foreground" />}
          </div>
        </button>
      ))}
    </div>
  );
}
