import Link from "next/link";
import { Newspaper, ChevronRight } from "lucide-react";
import { DailyBrief } from "@/types/finance";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatFullDate } from "@/lib/format";

interface DailyBriefPreviewCardProps {
  brief: DailyBrief;
  className?: string;
}

export function DailyBriefPreviewCard({ brief, className }: DailyBriefPreviewCardProps) {
  return (
    <Link href="/brief">
      <Card
        className={cn(
          "group cursor-pointer transition-all hover:shadow-sm",
          brief.hasNew && "border-primary/30",
          className
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Newspaper className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">每日投资简报</p>
                <p className="text-xs text-muted-foreground">{formatFullDate(brief.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {brief.hasNew && (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
          <p className="text-sm mt-3 text-muted-foreground line-clamp-2">{brief.summary}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
