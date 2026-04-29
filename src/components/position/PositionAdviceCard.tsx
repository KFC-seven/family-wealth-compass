import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, AlertTriangle } from "lucide-react";
import { RiskLevelBadge } from "@/components/financial/GeneralBadges";
import type { PositionAdvice } from "@/types/finance";

interface PositionAdviceCardProps {
  advice: PositionAdvice;
}

export function PositionAdviceCard({ advice }: PositionAdviceCardProps) {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-warning" />
          <span className="text-sm font-semibold">AI 分析建议</span>
          <RiskLevelBadge level={advice.riskLevel} className="ml-auto" />
        </div>
        <div>
          <p className="text-lg font-bold text-primary">{advice.type}</p>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">核心理由</p>
            <p>{advice.reason}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">触发条件</p>
              <p className="text-xs">{advice.triggerCondition}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">不确定性</p>
              <p className="text-xs">{advice.uncertainty}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              与个人投资理念匹配度：{advice.philosophyMatch}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
