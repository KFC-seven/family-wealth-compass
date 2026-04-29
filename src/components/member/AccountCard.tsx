import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { MoneyText } from "@/components/financial/MoneyText";
import { formatSignedMoney, formatCompactMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccountSummary } from "@/types/finance";

interface AccountCardProps {
  account: AccountSummary;
  className?: string;
}

export function AccountCard({ account, className }: AccountCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{account.name}</p>
            <p className="text-xs text-muted-foreground">{account.platform}</p>
          </div>
        </div>
        <div>
          <MoneyText value={account.totalValue} size="xl" />
          <p className="text-xs text-muted-foreground mt-0.5">
            现金 {formatCompactMoney(account.cashBalance)} · {account.holdingCount} 个持仓
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          <div>
            <p className="text-[10px] text-muted-foreground">持仓收益</p>
            <p className={cn("text-xs font-medium tabular-nums", account.holdingReturn >= 0 ? "text-positive" : "text-negative")}>
              {formatSignedMoney(account.holdingReturn)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">已实现</p>
            <p className={cn("text-xs font-medium tabular-nums", account.realizedReturn >= 0 ? "text-positive" : "text-negative")}>
              {formatSignedMoney(account.realizedReturn)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">累计</p>
            <p className={cn("text-xs font-medium tabular-nums", account.cumulativeReturn >= 0 ? "text-positive" : "text-negative")}>
              {formatSignedMoney(account.cumulativeReturn)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
