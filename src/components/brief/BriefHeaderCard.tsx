import { Card, CardContent } from "@/components/ui/card";
import { formatSignedMoney, formatPercent } from "@/lib/format";
import { BRIEF_STATUS_LABELS, BriefStatus } from "@/types/brief";
import { cn } from "@/lib/utils";

interface BriefHeaderCardProps {
  date: string;
  generatedAt: string;
  status: BriefStatus;
  todayReturn: number;
  todayReturnRate: number | null;
  affectedHoldings: number;
  highRiskCount: number;
  pushed: boolean;
}

const statusStyles: Record<BriefStatus, string> = {
  generated: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  generating: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse",
  failed: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  pushed: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
};

export function BriefHeaderCard({ date, generatedAt, status, todayReturn, todayReturnRate, affectedHoldings, highRiskCount, pushed }: BriefHeaderCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">每日投资简报</p>
            <h1 className="text-2xl font-bold mt-0.5">{date}</h1>
            <p className="text-xs text-muted-foreground mt-1">生成时间 {generatedAt}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium", statusStyles[status])}>
              {BRIEF_STATUS_LABELS[status]}
            </span>
            {pushed && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">已推送微信</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">今日收益</p>
            <p className={cn("text-xl font-bold tabular-nums mt-0.5", todayReturn >= 0 ? "text-positive" : "text-negative")}>
              {formatSignedMoney(todayReturn)}
            </p>
            {todayReturnRate !== null && (
              <p className={cn("text-xs tabular-nums", todayReturn >= 0 ? "text-positive" : "text-negative")}>{formatPercent(todayReturnRate)}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">受影响持仓</p>
            <p className="text-xl font-bold tabular-nums mt-0.5">{affectedHoldings}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">风险提醒</p>
            <p className={cn("text-xl font-bold tabular-nums mt-0.5", highRiskCount > 0 ? "text-warning" : "")}>{highRiskCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">家庭影响方向</p>
            <p className={cn("text-xl font-bold mt-0.5", todayReturn >= 0 ? "text-positive" : "text-negative")}>
              {todayReturn >= 0 ? "偏积极" : "偏负面"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
