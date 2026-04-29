import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { formatCompactMoney } from "@/lib/format";

interface CashBalanceCardProps {
  cashBalance: number;
  totalAssets: number;
}

export function CashBalanceCard({ cashBalance, totalAssets }: CashBalanceCardProps) {
  const cashRatio = totalAssets > 0 ? (cashBalance / totalAssets) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">现金余额</p>
            <p className="text-xs text-muted-foreground">
              占总资产 {cashRatio.toFixed(1)}%
            </p>
          </div>
        </div>
        <p className="mt-3 text-2xl font-semibold tabular-nums">
          {formatCompactMoney(cashBalance)}
        </p>
      </CardContent>
    </Card>
  );
}
