import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MemberImpactSummary } from "@/types/brief";
import { formatSignedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MemberImpactCardProps {
  data: MemberImpactSummary;
}

const MEMBER_ROUTES: Record<string, string> = {
  "member-1": "/members/member-1",
  "member-2": "/members/member-2",
  "member-3": "/members/member-3",
};

export function MemberImpactCard({ data }: MemberImpactCardProps) {
  const route = MEMBER_ROUTES[data.memberId] || "#";
  return (
    <Link href={route}>
      <Card className="group cursor-pointer transition-all hover:shadow-sm h-full">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold group-hover:text-primary transition-colors">{data.memberName}</p>
              <span className="text-xs text-muted-foreground">{data.affectedHoldingCount} 个持仓受影响</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className={cn("text-xl font-bold tabular-nums", data.todayReturn >= 0 ? "text-positive" : "text-negative")}>
              {formatSignedMoney(data.todayReturn)}
            </p>
            <span className="text-xs text-muted-foreground">今日</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground flex-shrink-0">主要影响:</span>
              <span>{data.mainAffectedAssets.join("、")}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground flex-shrink-0">理念匹配:</span>
              <span>{data.philosophyMatch}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-warning flex-shrink-0">风险:</span>
              <span className="text-warning">{data.riskAlert}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
