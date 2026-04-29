"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RecognitionProgressProps {
  status: "idle" | "recognizing" | "done" | "error";
}

export function RecognitionProgress({ status }: RecognitionProgressProps) {
  if (status === "idle") return null;

  return (
    <Card>
      <CardContent className="p-5">
        {status === "recognizing" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm font-medium">正在识别...</p>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-[progress_2s_ease-in-out]" style={{ width: "60%", animation: "none" }} />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="animate-pulse">正在分析截图布局...</p>
            </div>
          </div>
        )}
        {status === "done" && (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-positive" />
            <span className="font-medium">识别完成</span>
            <span className="text-muted-foreground">发现待处理资产</span>
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-negative">
            <span className="w-2 h-2 rounded-full bg-negative" />
            <span className="font-medium">识别失败</span>
            <span className="text-muted-foreground">请重试或选择其他截图</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
