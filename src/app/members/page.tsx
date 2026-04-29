import Link from "next/link";
import { ChevronRight, User } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { mockMembers } from "@/data/mock-members";
import { mockHoldings } from "@/data/mock-holdings";
import { mockHousehold } from "@/data/mock-household";
import { formatMoney, formatSignedMoney, formatPercent } from "@/lib/format";
import { calculateMemberSummary } from "@/lib/returns";

export default function MembersListPage() {
  return (
    <div className="space-y-6 animate-in">
      <PageHeader title="成员" subtitle={`${mockMembers.length} 个家庭成员`} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockMembers.map((member) => {
          const memberHoldings = mockHoldings.filter((h) => h.memberId === member.id);
          const summary = calculateMemberSummary(memberHoldings, member.cashBalance);
          const ratio = mockHousehold.totalAssets > 0
            ? (summary.totalAssets / mockHousehold.totalAssets) * 100 : 0;

          return (
            <Link key={member.id} href={`/members/${member.id}`}>
              <Card className="group cursor-pointer transition-all hover:shadow-sm h-full">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold">{member.name}</p>
                      <p className="text-xs text-muted-foreground">占家庭 {ratio.toFixed(1)}%</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div>
                    <p className="text-2xl font-bold tabular-nums">{formatMoney(summary.totalAssets)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">累计收益</p>
                      <p className={`font-medium tabular-nums ${summary.cumulativeReturn >= 0 ? "text-positive" : "text-negative"}`}>
                        {formatSignedMoney(summary.cumulativeReturn)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">持仓收益</p>
                      <p className={`font-medium tabular-nums ${summary.holdingReturn >= 0 ? "text-positive" : "text-negative"}`}>
                        {formatSignedMoney(summary.holdingReturn)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                    <span>{member.accounts.length} 个账户</span>
                    <span>·</span>
                    <span>{memberHoldings.filter((h) => !h.isCleared).length} 个持仓</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
