import { formatSignedMoney, formatMoney, formatFullDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/financial/GeneralBadges";
import type { Transaction } from "@/types/finance";

const TX_LABELS: Record<string, string> = {
  BUY: "买入", SELL: "卖出", DIVIDEND: "分红", INTEREST: "利息",
  DEPOSIT: "转入", WITHDRAW: "转出", FEE: "费用", ADJUSTMENT: "调整",
};
const TX_COLORS: Record<string, string> = {
  BUY: "text-negative", SELL: "text-positive", DIVIDEND: "text-positive",
  INTEREST: "text-positive", DEPOSIT: "", WITHDRAW: "", FEE: "text-negative", ADJUSTMENT: "text-warning",
};
const TX_BG: Record<string, string> = {
  BUY: "bg-red-50/30 dark:bg-red-950/20", SELL: "bg-green-50/30 dark:bg-green-950/20",
};

interface PositionLifecycleTableProps {
  transactions: Transaction[];
  holdingId: string;
}

export function PositionLifecycleTable({ transactions, holdingId }: PositionLifecycleTableProps) {
  if (transactions.length === 0) return <EmptyState message="暂无交易记录" />;

  let runningQuantity = 0;
  let runningCost = 0;

  return (
    <div className="space-y-1.5">
      {transactions.map((tx, i) => {
        if (tx.type === "BUY" && tx.quantity) {
          runningQuantity += tx.quantity;
          runningCost += tx.amount + (tx.fee || 0);
        } else if (tx.type === "SELL" && tx.quantity) {
          const avgCost = runningQuantity > 0 ? runningCost / runningQuantity : 0;
          const soldCost = avgCost * tx.quantity;
          const realized = tx.amount - soldCost - (tx.fee || 0) - (tx.tax || 0);
          runningQuantity -= tx.quantity;
          runningCost -= soldCost;
          runningCost = Math.max(0, runningCost);

          return (
            <div key={tx.id} className={cn("flex items-center justify-between p-3 rounded-lg border border-border text-sm", TX_BG[tx.type])}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium", TX_COLORS[tx.type])}>{TX_LABELS[tx.type]}</span>
                  <span className="text-xs text-muted-foreground">{formatFullDate(tx.date)}</span>
                  <span className="text-xs text-muted-foreground">{tx.quantity} 份 × {formatMoney(tx.price || 0)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  余 {runningQuantity} 份 · 成本 {formatMoney(runningCost)} · 本次实现 {formatSignedMoney(realized)}
                  {tx.fee ? ` · 费 ${formatMoney(tx.fee)}` : ""}{tx.note ? ` · ${tx.note}` : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-4 tabular-nums text-xs">
                <p className="font-medium">{formatSignedMoney(tx.amount)}</p>
                <p className={cn(realized >= 0 ? "text-positive" : "text-negative")}>{formatSignedMoney(realized)}</p>
              </div>
            </div>
          );
        }

        const isAdditive = tx.type === "DIVIDEND" || tx.type === "INTEREST";
        return (
          <div key={tx.id} className={cn("flex items-center justify-between p-3 rounded-lg border border-border text-sm", TX_BG[tx.type])}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-medium", TX_COLORS[tx.type])}>{TX_LABELS[tx.type]}</span>
                <span className="text-xs text-muted-foreground">{formatFullDate(tx.date)}</span>
                {tx.quantity && <span className="text-xs text-muted-foreground">{tx.quantity} 份</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                余 {runningQuantity} 份 · 成本 {formatMoney(runningCost)}{tx.note ? ` · ${tx.note}` : ""}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-4 tabular-nums text-xs">
              <p className={cn("font-medium", isAdditive ? "text-positive" : "")}>
                {isAdditive ? formatSignedMoney(tx.amount) : formatSignedMoney(tx.amount)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
