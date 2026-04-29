import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { InvestorPhilosophy } from "@/types/finance";

interface InvestorPhilosophyCardProps {
  philosophy: InvestorPhilosophy;
}

export function InvestorPhilosophyCard({ philosophy }: InvestorPhilosophyCardProps) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-warning" />
          <p className="text-sm font-semibold">个人投资理念</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">风险偏好</p>
            <p className="font-medium">{philosophy.riskPreference}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">投资周期</p>
            <p className="font-medium">{philosophy.investmentHorizon}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">主要目标</p>
            <p className="font-medium">{philosophy.mainGoal}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">交易频率</p>
            <p className="font-medium">{philosophy.tradingFrequency}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">偏好资产</p>
            <div className="flex gap-1.5 mt-1">
              {philosophy.preferredAssets.map((a) => (
                <span key={a} className="text-xs bg-secondary px-2 py-0.5 rounded">{a}</span>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">避免行为</p>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {philosophy.avoidBehaviors.map((b) => (
                <span key={b} className="text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
