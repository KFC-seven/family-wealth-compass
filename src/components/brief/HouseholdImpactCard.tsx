import { Card, CardContent } from "@/components/ui/card";
import { HouseholdImpactSummary } from "@/types/brief";
import { formatSignedMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function HouseholdImpactCard({ summary }: { summary: HouseholdImpactSummary }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <p className="text-sm font-semibold">家庭资产影响摘要</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">影响方向</p>
            <p className={cn("font-medium", summary.direction === "positive" ? "text-positive" : summary.direction === "negative" ? "text-negative" : "")}>
              {summary.direction === "positive" ? "偏积极" : summary.direction === "negative" ? "偏负面" : "中性"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">今日收益</p>
            <p className={cn("font-medium tabular-nums", summary.todayReturn >= 0 ? "text-positive" : "text-negative")}>
              {formatSignedMoney(summary.todayReturn)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">主要收益贡献</p>
            <p className="font-medium">{summary.topPositiveAsset}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">主要亏损来源</p>
            <p className="font-medium text-negative">{summary.topNegativeAsset}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">影响最大成员</p>
            <p className="font-medium">{summary.topAffectedMember}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">风险关键词</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {summary.riskKeywords.map((k) => (
                <span key={k} className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-warning px-1.5 py-0.5 rounded">{k}</span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
