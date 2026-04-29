import { BriefRiskAlert } from "@/types/brief";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

const levelConfig = {
  high: { icon: AlertTriangle, color: "text-positive bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900" },
  medium: { icon: AlertCircle, color: "text-warning bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900" },
  low: { icon: Info, color: "text-primary bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900" },
};

export function BriefRiskAlertCard({ alert }: { alert: BriefRiskAlert }) {
  const cfg = levelConfig[alert.level];
  const Icon = cfg.icon;
  return (
    <div className={cn("flex gap-3 p-3.5 rounded-xl border", cfg.color)}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="min-w-0 space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">{alert.type}</span>
          <span className="text-xs text-muted-foreground">{alert.relatedMember} · {alert.relatedHolding}</span>
        </div>
        <p className="text-xs opacity-80">{alert.description}</p>
        <div className="flex gap-4 text-xs opacity-70">
          <span>关注: {alert.suggestWatch}</span>
          <span>触发: {alert.triggerCondition}</span>
        </div>
      </div>
    </div>
  );
}
