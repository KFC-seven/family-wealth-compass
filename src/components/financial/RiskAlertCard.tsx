import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { RiskAlert } from "@/types/finance";
import { cn } from "@/lib/utils";

const iconMap = {
  danger: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  danger: "text-positive bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
  warning: "text-warning bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
  info: "text-primary bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
};

interface RiskAlertCardProps {
  alerts: RiskAlert[];
  className?: string;
}

export function RiskAlertCard({ alerts, className }: RiskAlertCardProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        暂无风险提醒
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {alerts.map((alert) => {
        const Icon = iconMap[alert.type];
        return (
          <div
            key={alert.id}
            className={cn("flex gap-3 rounded-xl border p-3.5", colorMap[alert.type])}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs mt-0.5 opacity-80">{alert.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
