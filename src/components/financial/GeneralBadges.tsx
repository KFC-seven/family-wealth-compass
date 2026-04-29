import { cn } from "@/lib/utils";
import { ASSET_TYPE_LABELS, AssetType } from "@/types/finance";

export function ScopeBadge({ scope, className }: { scope: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground", className)}>
      {scope}
    </span>
  );
}

const typeColorMap: Record<AssetType, string> = {
  cash: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  aShare: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  usStock: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  etf: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400",
  mutualFund: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400",
  bankWealth: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400",
  gold: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
};

export function AssetTypeBadge({ type, className }: { type: AssetType; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", typeColorMap[type], className)}>
      {ASSET_TYPE_LABELS[type]}
    </span>
  );
}

const riskColorMap = {
  low: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  high: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
};

export function RiskLevelBadge({ level, className }: { level: "low" | "medium" | "high"; className?: string }) {
  const labels = { low: "低风险", medium: "中风险", high: "高风险" };
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", riskColorMap[level], className)}>
      {labels[level]}
    </span>
  );
}

export function EmptyState({ message = "暂无数据" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function LoadingState({ height = 120 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export function ErrorState({ message = "加载失败", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground gap-2">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-primary hover:underline text-xs">
          重试
        </button>
      )}
    </div>
  );
}

const TIME_RANGES = ["近7日", "近30日", "本月", "今年", "全部"] as const;

export function TimeRangeSelector({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-1", className)}>
      {TIME_RANGES.map((range) => (
        <button
          key={range}
          className="px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
        >
          {range}
        </button>
      ))}
    </div>
  );
}
