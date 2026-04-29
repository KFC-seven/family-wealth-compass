import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AdviceCardData } from "@/types/brief";
import { RiskLevelBadge } from "@/components/financial/GeneralBadges";
import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";

export function AdviceCard({ advice }: { advice: AdviceCardData }) {
  return (
    <Card className="border-primary/20 h-full">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold">{advice.type}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RiskLevelBadge level={advice.riskLevel} />
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              advice.intensity === "high" ? "bg-red-50 text-red-600 dark:bg-red-950/30" :
              advice.intensity === "medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30" :
              "bg-muted text-muted-foreground"
            )}>
              强度{advice.intensity === "high" ? "高" : advice.intensity === "medium" ? "中" : "低"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{advice.relatedMember}</span>
          <span>·</span>
          <span>{advice.relatedAsset}</span>
        </div>
        <p className="text-sm leading-relaxed">{advice.reason}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">触发条件</p>
            <p className="font-medium">{advice.triggerCondition}</p>
          </div>
          <div>
            <p className="text-muted-foreground">不确定性</p>
            <p className="font-medium">{advice.uncertainty}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Lightbulb className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
          <span>理念匹配: {advice.philosophyMatch} · 观察周期: {advice.observePeriod}</span>
        </div>
      </CardContent>
    </Card>
  );
}
