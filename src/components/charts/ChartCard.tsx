import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  className?: string;
  loading?: boolean;
  empty?: boolean;
  error?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  className,
  loading = false,
  empty = false,
  error = false,
  emptyMessage = "暂无数据",
  errorMessage = "加载失败",
  children,
  action,
}: ChartCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between p-5 pb-0">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent className="p-5">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            {errorMessage}
          </div>
        )}
        {empty && !loading && !error && (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
        {!loading && !error && !empty && children}
      </CardContent>
    </Card>
  );
}
