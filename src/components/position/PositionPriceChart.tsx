"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceDot, ReferenceLine } from "recharts";
import { PricePoint, TradeMarker } from "@/types/finance";
import { formatMoney, formatDate } from "@/lib/format";

interface PositionPriceChartProps {
  prices: PricePoint[];
  markers: TradeMarker[];
}

export function PositionPriceChart({ prices, markers }: PositionPriceChartProps) {
  if (!prices || prices.length === 0) {
    return <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">暂无价格数据</div>;
  }

  const markerMap: Record<string, TradeMarker> = {};
  markers.forEach((m) => { markerMap[m.date] = m; });

  const chartData = prices.map((p) => ({
    ...p,
    isBuy: markers.some((m) => m.date === p.date && m.type === "BUY"),
    isSell: markers.some((m) => m.date === p.date && m.type === "SELL"),
  }));

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="ppGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0071e3" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#86868b" }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
          <YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#86868b" }} tickFormatter={(v: number) => formatMoney(v)} width={70} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            const marker = markerMap[d.date];
            return (
              <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm space-y-1">
                <p className="text-muted-foreground">{formatDate(d.date)}</p>
                <p className="tabular-nums font-medium">{formatMoney(d.price)}</p>
                {marker && (
                  <p className={marker.type === "BUY" ? "text-positive" : marker.type === "SELL" ? "text-negative" : "text-warning"}>
                    {marker.type === "BUY" ? "买入" : marker.type === "SELL" ? "卖出" : "分红"} {marker.quantity > 0 ? `${marker.quantity}份` : ""} · {formatMoney(marker.amount)}
                  </p>
                )}
              </div>
            );
          }} />
          <Area type="monotone" dataKey="price" stroke="#0071e3" strokeWidth={2} fill="url(#ppGrad)" dot={false} />
          {markers.filter((m) => m.type === "BUY").map((m, i) => (
            <ReferenceDot key={`buy-${i}`} x={m.date} y={m.price} r={5} fill="#dc2626" stroke="white" strokeWidth={2} />
          ))}
          {markers.filter((m) => m.type === "SELL").map((m, i) => (
            <ReferenceDot key={`sell-${i}`} x={m.date} y={m.price} r={5} fill="#16a34a" stroke="white" strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 justify-center mt-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-positive" /> 买入</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-negative" /> 卖出</span>
      </div>
    </div>
  );
}
