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
  INTEREST: "text-positive", DEPOSIT: "text-foreground", WITHDRAW: "text-foreground",
  FEE: "text-negative", ADJUSTMENT: "text-warning",
};

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  if (transactions.length === 0) return <EmptyState message="暂无交易记录" />;

  return (
    <div className="space-y-2">
      {transactions.slice(0, 20).map((tx) => (
        <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border text-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-medium", TX_COLORS[tx.type])}>{TX_LABELS[tx.type]}</span>
              <span className="text-xs text-muted-foreground">{formatFullDate(tx.date)}</span>
              {tx.quantity && tx.price && (
                <span className="text-xs text-muted-foreground">
                  {tx.quantity} × {formatMoney(tx.price)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tx.note || ""}
              {tx.fee ? ` · 费用 ${formatMoney(tx.fee)}` : ""}
            </p>
          </div>
          <div className="text-right flex-shrink-0 ml-4 tabular-nums">
            <p className={cn("text-sm font-medium", tx.type === "SELL" || tx.type === "DIVIDEND" || tx.type === "INTEREST" ? "text-positive" : tx.type === "BUY" || tx.type === "FEE" ? "text-negative" : "")}>
              {tx.type === "BUY" || tx.type === "FEE" ? `-${formatMoney(tx.amount)}` : formatSignedMoney(tx.amount)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
