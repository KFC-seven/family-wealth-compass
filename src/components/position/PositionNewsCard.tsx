import { formatFullDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/financial/GeneralBadges";
import type { PositionNewsItem } from "@/types/finance";

const impactColors = { positive: "text-positive", negative: "text-negative", neutral: "text-muted-foreground" };
const impactLabels = { positive: "利好", negative: "利空", neutral: "中性" };
const importanceLabels = { high: "重要", medium: "一般", low: "参考" };

interface PositionNewsCardProps {
  news: PositionNewsItem[];
}

export function PositionNewsCard({ news }: PositionNewsCardProps) {
  if (news.length === 0) return <EmptyState message="暂无相关消息" />;

  return (
    <div className="space-y-3">
      {news.map((item) => (
        <div key={item.id} className="p-3.5 rounded-xl border border-border space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", impactColors[item.impact], "bg-current/10")}>
              {impactLabels[item.impact]}
            </span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{importanceLabels[item.importance]}</span>
            <span className="text-xs text-muted-foreground">{formatFullDate(item.date)}</span>
          </div>
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
          <p className="text-[10px] text-muted-foreground">来源: {item.source}</p>
        </div>
      ))}
    </div>
  );
}
