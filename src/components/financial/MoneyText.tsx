import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

interface MoneyTextProps {
  value: number;
  currency?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
  "2xl": "text-4xl",
};

export function MoneyText({ value, currency = "CNY", className, size = "md" }: MoneyTextProps) {
  return (
    <span className={cn("tabular-nums font-medium", sizeClasses[size], className)}>
      {formatMoney(value, currency)}
    </span>
  );
}
