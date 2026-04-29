import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSignedMoney, formatMoney } from "@/lib/format";
import { ReturnBreakdown } from "@/types/finance";
import { TrendingUp, TrendingDown, Banknote, Receipt, PieChart } from "lucide-react";

interface PositionReturnBreakdownProps {
  breakdown: ReturnBreakdown;
}

const items = [
  { key: "holdingReturn", label: "持仓收益", icon: TrendingUp, color: "text-positive", bg: "bg-red-50 dark:bg-red-950/30" },
  { key: "tradingRealized", label: "交易已实现", icon: TrendingDown, color: "text-positive", bg: "bg-green-50 dark:bg-green-950/30" },
  { key: "dividendInterest", label: "分红/利息", icon: Banknote, color: "text-positive", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { key: "feesTaxes", label: "费用/税费", icon: Receipt, color: "text-negative", bg: "bg-gray-50 dark:bg-gray-800" },
  { key: "cumulativeReturn", label: "累计收益", icon: PieChart, color: "text-positive font-semibold", bg: "bg-primary/5" },
] as const;

export function PositionReturnBreakdown({ breakdown }: PositionReturnBreakdownProps) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = item.icon;
        const value = breakdown[item.key as keyof ReturnBreakdown];
        return (
          <div key={item.key} className={cn("flex items-center justify-between p-3 rounded-lg border border-border", item.bg)}>
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{item.label}</span>
            </div>
            <span className={cn("text-sm tabular-nums", item.key === "cumulativeReturn" ? (value >= 0 ? "text-positive" : "text-negative") : item.color)}>
              {formatSignedMoney(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
