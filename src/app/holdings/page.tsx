import Link from "next/link";
import { ChevronRight, User } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { AssetTypeBadge } from "@/components/financial/GeneralBadges";
import { AssetDrilldownChart } from "@/components/charts/AssetDrilldownChart";
import { getHoldingsData } from "@/lib/data-source";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ASSET_TYPE_LABELS, AssetType } from "@/types/finance";

const ASSET_COLORS: Record<string, string> = {
  cash: "#6b7280", aShare: "#b91c1c", usStock: "#2563eb",
  etf: "#4f46e5", mutualFund: "#7c3aed", bankWealth: "#0891b2", gold: "#d97706",
};

export default async function HoldingsListPage() {
  const { members, currentHoldings: allCurrent, clearedHoldings: allCleared } = await getHoldingsData();

  // Build cleared lookup by member
  const clearedByMember: Record<string, typeof allCleared> = {};
  for (const h of allCleared) {
    if (!clearedByMember[h.memberId]) clearedByMember[h.memberId] = [];
    clearedByMember[h.memberId].push(h);
  }

  return (
    <div className="space-y-8 animate-in">
      <PageHeader title="持仓" subtitle="按成员分组" />

      {members.map((member) => {
        const currentHoldings = allCurrent.filter((h) => h.memberId === member.id);
        const clearedHoldings = clearedByMember[member.id] || [];
        if (currentHoldings.length === 0 && clearedHoldings.length === 0) return null;

        // Compute drilldown data for this member
        const typeMap: Record<string, { name: string; value: number }[]> = {};
        currentHoldings.forEach((h) => {
          if (!typeMap[h.assetType]) typeMap[h.assetType] = [];
          typeMap[h.assetType].push({ name: h.assetName, value: h.marketValue });
        });
        const typeLevelItems = Object.entries(typeMap).map(([type, items]) => ({
          name: ASSET_TYPE_LABELS[type as AssetType] || type,
          value: items.reduce((s, i) => s + i.value, 0),
          color: ASSET_COLORS[type] || "#86868b",
          type: type as AssetType,
        }));
        const holdingLevelMap: Record<string, { name: string; value: number; color: string }[]> = {};
        const HOLDING_COLORS = ["#0071e3", "#5856d6", "#34c759", "#ff9f0a", "#ff453a", "#bf5af2", "#64d2ff", "#30d158"];
        Object.entries(typeMap).forEach(([type, items]) => {
          holdingLevelMap[type] = items.map((item, i) => ({
            name: item.name,
            value: item.value,
            color: HOLDING_COLORS[i % HOLDING_COLORS.length],
          }));
        });

        return (
          <div key={member.id}>
            {/* Member section header */}
            <Link href={`/members/${member.id}`} className="flex items-center gap-2 mb-3 group">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <p className="text-base font-semibold group-hover:text-primary transition-colors">{member.name}</p>
              <span className="text-xs text-muted-foreground">{currentHoldings.length} 个持仓</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            {/* Member asset drilldown chart */}
            <div className="mb-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">资产分布 · 点击下钻</p>
                <AssetDrilldownChart typeLevel={typeLevelItems} holdingLevel={holdingLevelMap} />
              </div>
            </div>

            {/* Holdings */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currentHoldings.map((h) => (
                <Link key={h.id} href={`/holdings/${h.id}`}>
                  <Card className="group cursor-pointer transition-all hover:shadow-sm h-full">
                    <CardContent className="p-4 h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-start gap-2 mb-2">
                          <p className="text-sm font-medium truncate flex-1">{h.assetName}</p>
                          <AssetTypeBadge type={h.assetType} />
                        </div>
                        <p className="text-lg font-bold tabular-nums">{formatMoney(h.marketValue)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <div>
                          <p className="text-[10px] text-muted-foreground">持仓收益</p>
                          <p className={cn("text-xs font-medium tabular-nums", h.holdingReturn >= 0 ? "text-positive" : "text-negative")}>
                            {formatSignedMoney(h.holdingReturn)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">累计收益</p>
                          <p className={cn("text-xs font-medium tabular-nums", h.cumulativeReturn >= 0 ? "text-positive" : "text-negative")}>
                            {formatSignedMoney(h.cumulativeReturn)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Cleared holdings */}
            {clearedHoldings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {clearedHoldings.map((h) => (
                  <Link key={h.id} href={`/holdings/${h.id}`} className="flex items-center justify-between p-3 rounded-xl border border-border opacity-50 hover:opacity-100 transition-opacity group">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-neutral border border-border px-1.5 py-0.5 rounded">已清仓</span>
                      <p className="text-sm font-medium truncate">{h.assetName}</p>
                      <AssetTypeBadge type={h.assetType} />
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={cn("text-xs font-medium tabular-nums", h.realizedReturn >= 0 ? "text-positive" : "text-negative")}>
                        {formatSignedMoney(h.realizedReturn)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
