"use client";

import { useState } from "react";
import { Cell, PieChart, Pie, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft } from "lucide-react";
import { formatAssetType, AssetType } from "@/types/finance";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const ASSET_COLORS: Record<string, string> = {
  cash: "#6b7280", aShare: "#b91c1c", usStock: "#2563eb",
  etf: "#4f46e5", mutualFund: "#7c3aed", bankWealth: "#0891b2", gold: "#d97706",
};

interface DrilldownItem {
  name: string;
  value: number;
  color: string;
  type?: AssetType;
  assetId?: string;
}

interface AssetDrilldownChartProps {
  typeLevel: DrilldownItem[];
  holdingLevel: Record<string, DrilldownItem[]>;
  className?: string;
}

export function AssetDrilldownChart({ typeLevel, holdingLevel, className }: AssetDrilldownChartProps) {
  const [drillType, setDrillType] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const currentData = drillType ? (holdingLevel[drillType] || []) : typeLevel;
  const isDrilled = drillType !== null;

  return (
    <div className={cn("w-full", className)}>
      {isDrilled && (
        <button
          onClick={() => setDrillType(null)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> {formatAssetType(drillType)}
        </button>
      )}

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={currentData}
              cx="50%" cy="50%"
              innerRadius={55} outerRadius={85}
              paddingAngle={2} strokeWidth={0}
              dataKey="value"
              onClick={(_, i) => {
                if (!drillType) {
                  const entry = currentData[i];
                  if (entry.type && holdingLevel[entry.type]) setDrillType(entry.type);
                }
              }}
              style={{ cursor: drillType ? "default" : "pointer" }}
            >
              {currentData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color}
                  opacity={hovered === null || hovered === entry.name ? 1 : 0.4}
                  onMouseEnter={() => setHovered(entry.name)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as DrilldownItem;
                return (
                  <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium">{d.name}</p>
                    <p className="tabular-nums text-muted-foreground">{formatMoney(d.value)}</p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center mt-1">
        {currentData.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => {
              if (!drillType && item.type && holdingLevel[item.type]) setDrillType(item.type);
            }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="font-medium">{item.name}</span>
            <span className="text-muted-foreground">
              {((item.value / currentData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {drillType && (
        <p className="text-[10px] text-muted-foreground text-center mt-1">点击类别名可返回上级</p>
      )}
    </div>
  );
}
