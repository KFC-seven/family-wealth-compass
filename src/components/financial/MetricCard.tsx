import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  className?: string;
  tooltip?: string;
}

export function MetricCard({ label, value, delta, className, tooltip }: MetricCardProps) {
  return (
    <div className={cn("space-y-1", className)} title={tooltip}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="tabular-nums font-semibold">{value}</div>
      {delta && <div className="text-xs">{delta}</div>}
    </div>
  );
}
