"use client";

import Link from "next/link";
import { ChevronRight, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AssetTypeBadge } from "@/components/financial/GeneralBadges";
import { AssetDrilldownChart } from "@/components/charts/AssetDrilldownChart";
import { ExportButton } from "@/components/ui/ExportButton";
import { useSorted } from "@/components/financial/SortBar";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import { formatAssetType } from "@/types/finance";
import { cn } from "@/lib/utils";
import type { Holding } from "@/types/finance";

interface MemberGroup {
  id: string;
  name: string;
  holdings: Holding[];
}

interface Props {
  members: MemberGroup[];
  clearedByMember: Record<string, Holding[]>;
}

export function HoldingsListClient({ members, clearedByMember }: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">持仓</h1>
          <p className="text-sm text-muted-foreground">按成员分组</p>
        </div>
        <ExportButton label="导出 Excel" />
      </div>

      {members.map((member) => {
        const cleared = clearedByMember[member.id] || [];
        if (member.holdings.length === 0 && cleared.length === 0) return null;

        return (
          <MemberSection key={member.id} member={member} cleared={cleared} />
        );
      })}
    </div>
  );
}

function MemberSection({ member, cleared }: { member: MemberGroup; cleared: Holding[] }) {
  const { sorted, sortBar } = useSorted(member.holdings, "marketValue");

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Link href={`/members/${member.id}`} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <p className="text-base font-semibold group-hover:text-primary transition-colors">{member.name}</p>
          <span className="text-xs text-muted-foreground">{member.holdings.length} 个持仓</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <div className="flex items-center gap-3">
          <ExportButton memberId={member.id} label="导出" />
          {sortBar}
        </div>
      </div>

      {/* Asset drilldown chart */}
      <MemberDrilldown holdings={member.holdings} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((h) => {
          const rate = h.holdingReturnRate ?? (h.costBasis > 0 ? h.holdingReturn / h.costBasis : null);
          return (
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
                      <p className="text-[10px] text-muted-foreground">收益率</p>
                      <p className={cn("text-xs font-medium tabular-nums", (rate ?? 0) >= 0 ? "text-positive" : "text-negative")}>
                        {rate != null ? `${(rate * 100).toFixed(2)}%` : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {cleared.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {cleared.map((h) => (
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
}

const CHART_COLORS = ["#0071e3", "#5856d6", "#34c759", "#ff9f0a", "#ff453a", "#bf5af2", "#64d2ff", "#30d158"];
const TYPE_COLORS: Record<string, string> = {
  "股票": "#b91c1c", "基金": "#7c3aed", "黄金": "#d97706", "债券": "#0891b2", "现金": "#6b7280", "其他": "#86868b",
};

function MemberDrilldown({ holdings }: { holdings: Holding[] }) {
  const typeMap: Record<string, { name: string; value: number }[]> = {};
  holdings.forEach((h) => {
    const label = formatAssetType(h.assetType);
    if (!typeMap[label]) typeMap[label] = [];
    typeMap[label].push({ name: h.assetName, value: h.marketValue });
  });

  const typeLevelItems = Object.entries(typeMap).map(([type, items]) => ({
    name: type,
    value: items.reduce((s, i) => s + i.value, 0),
    color: TYPE_COLORS[type] || "#86868b",
    type,
  }));

  const holdingLevelMap: Record<string, { name: string; value: number; color: string }[]> = {};
  Object.entries(typeMap).forEach(([type, items]) => {
    holdingLevelMap[type] = items.map((item, i) => ({
      name: item.name,
      value: item.value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  });

  if (typeLevelItems.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">资产分布 · 点击下钻</p>
        <AssetDrilldownChart typeLevel={typeLevelItems as any} holdingLevel={holdingLevelMap as any} />
      </div>
    </div>
  );
}
