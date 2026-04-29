"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { MemberAllocation } from "@/types/finance";
import { formatMoney } from "@/lib/format";

const COLORS = ["#0071e3", "#5856d6", "#34c759"];

const MEMBER_ROUTES: Record<string, string> = {
  "爸爸": "/members/member-1",
  "妈妈": "/members/member-2",
  "孩子": "/members/member-3",
};

interface MemberAllocationChartProps {
  data: MemberAllocation[];
}

export function MemberAllocationChart({ data }: MemberAllocationChartProps) {
  const router = useRouter();
  const total = data.reduce((s, i) => s + i.value, 0);
  const chartData = data.map((item, i) => ({
    name: item.memberName,
    value: item.value,
    pct: total > 0 ? (item.value / total) * 100 : 0,
    fill: COLORS[i % COLORS.length],
    route: MEMBER_ROUTES[item.memberName] || "#",
  }));

  const handleBarClick = (_: any, index: number) => {
    const route = chartData[index]?.route;
    if (route && route !== "#") router.push(route);
  };

  return (
    <div className="w-full">
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={48} barGap={8}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#86868b" }} />
            <YAxis hide />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
                  <p className="font-medium">{d.name}</p>
                  <p className="tabular-nums text-muted-foreground">{formatMoney(d.value)} ({d.pct.toFixed(1)}%)</p>
                </div>
              );
            }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} onClick={handleBarClick as any} style={{ cursor: "pointer" }}>
              {chartData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 justify-center mt-1">
        {chartData.map((item) => (
          <Link
            key={item.name}
            href={item.route}
            className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="font-medium">{item.name}</span>
            <span className="text-muted-foreground">{item.pct.toFixed(1)}%</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
