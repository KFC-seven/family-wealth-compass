import { cn } from "@/lib/utils";
import { formatSignedMoney, formatPercent } from "@/lib/format";

interface ReturnBadgeProps {
  value: number;
  rate: number | null;
  className?: string;
  size?: "sm" | "md";
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
};

export function ReturnBadge({ value, rate, className, size = "md" }: ReturnBadgeProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isZero = value === 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium tabular-nums",
        sizeClasses[size],
        isPositive && "bg-red-50 text-positive dark:bg-red-950/30",
        isNegative && "bg-green-50 text-negative dark:bg-green-950/30",
        isZero && "bg-muted text-neutral",
        className
      )}
    >
      <span>{formatSignedMoney(value)}</span>
      {rate !== null && (
        <>
          <span className="opacity-50">·</span>
          <span>{formatPercent(rate)}</span>
        </>
      )}
    </span>
  );
}
