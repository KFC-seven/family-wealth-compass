"use client";

import { Cell, PieChart, Pie, ResponsiveContainer, Tooltip } from "recharts";
import { AssetAllocation } from "@/types/finance";
import { formatAssetType } from "@/types/finance";
import { formatMoney } from "@/lib/format";

const ASSET_COLORS: Record<string, string> = {
  cash: "#6b7280",
  aShare: "#b91c1c",
  usStock: "#2563eb",
  etf: "#4f46e5",
  mutualFund: "#7c3aed",
  bankWealth: "#0891b2",
  gold: "#d97706",
};

interface AssetAllocationChartProps {
  data: AssetAllocation[];
}

export function AssetAllocationChart({ data }: AssetAllocationChartProps) {
  // Merge items with the same simplified label to avoid duplicate keys
  const merged: Record<string, { name: string; value: number; color: string }> = {};
  data.forEach((item) => {
    const name = formatAssetType(item.type);
    if (!merged[name]) {
      merged[name] = { name, value: 0, color: ASSET_COLORS[item.type] || "#86868b" };
    }
    merged[name].value += item.value;
  });
  const chartData = Object.values(merged);

  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
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
      <div className="flex flex-wrap gap-3 justify-center mt-1">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
