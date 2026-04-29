"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MonthlyAsset } from "@/types/finance";
import { formatMoney, formatMonth } from "@/lib/format";

interface AssetTrendChartProps {
  data: MonthlyAsset[];
}

export function AssetTrendChart({ data }: AssetTrendChartProps) {
  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5856d6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#5856d6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#86868b" }}
            tickFormatter={formatMonth}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#86868b" }}
            tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as MonthlyAsset;
              return (
                <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
                  <p className="text-muted-foreground">{d.month}</p>
                  <p className="tabular-nums font-medium">{formatMoney(d.value)}</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#5856d6"
            strokeWidth={2}
            fill="url(#assetGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
