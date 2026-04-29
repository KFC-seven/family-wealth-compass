"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DailyReturn } from "@/types/finance";
import { formatSignedMoney, formatDate } from "@/lib/format";

interface MemberReturnTrendChartProps {
  data: DailyReturn[];
}

export function MemberReturnTrendChart({ data }: MemberReturnTrendChartProps) {
  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="mReturnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0071e3" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#86868b" }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
          <YAxis hide />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as DailyReturn;
            return (
              <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
                <p className="text-muted-foreground">{formatDate(d.date)}</p>
                <p className={d.value >= 0 ? "text-positive" : "text-negative"}>{formatSignedMoney(d.value)}</p>
              </div>
            );
          }} />
          <Area type="monotone" dataKey="value" stroke="#0071e3" strokeWidth={2} fill="url(#mReturnGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
