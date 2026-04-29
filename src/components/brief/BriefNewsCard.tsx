import { BriefNewsItem, ImpactDirection, ImportanceLevel } from "@/types/brief";
import { formatFullDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const impactStyles: Record<ImpactDirection, string> = {
  positive: "text-positive bg-red-50 dark:bg-red-950/30",
  negative: "text-negative bg-green-50 dark:bg-green-950/30",
  neutral: "text-muted-foreground bg-muted",
  uncertain: "text-warning bg-amber-50 dark:bg-amber-950/30",
};

export function BriefNewsCard({ item }: { item: BriefNewsItem }) {
  return (
    <div className="p-4 rounded-xl border border-border space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.category}</span>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", impactStyles[item.impact])}>
          {item.impact === "positive" ? "正面" : item.impact === "negative" ? "负面" : item.impact === "uncertain" ? "不确定" : "中性"}
        </span>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", item.importance === "high" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          {item.importance === "high" ? "重要" : item.importance === "medium" ? "一般" : "参考"}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">{formatFullDate(item.date)}</span>
      </div>
      <p className="text-sm font-medium">{item.title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground">来源: {item.source}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">相关: {item.relatedAssets.join("、")}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{item.relatedMembers.join("、")}</span>
      </div>
      <div className="p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">AI 解读:</span> {item.aiInterpretation}
      </div>
    </div>
  );
}
