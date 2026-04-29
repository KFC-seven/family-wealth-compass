"use client";

import { cn } from "@/lib/utils";
import { RecognitionRowStatus } from "@/types/import";

const statusStyles: Record<RecognitionRowStatus, string> = {
  normal: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-900",
  low_confidence: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  missing_field: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-900",
  duplicate: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-900",
  pending_confirm: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-900",
};

const statusLabels: Record<RecognitionRowStatus, string> = {
  normal: "正常",
  low_confidence: "低置信度",
  missing_field: "缺失字段",
  duplicate: "疑似重复",
  pending_confirm: "待确认",
};

export function RecognitionStatusBadge({ status, className }: { status: RecognitionRowStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border", statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}

export function ConfidenceBadge({ confidence, className }: { confidence: number; className?: string }) {
  const isHigh = confidence >= 90;
  const isMedium = confidence >= 70;
  return (
    <span className={cn(
      "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
      isHigh ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" :
      isMedium ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
      "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
      className
    )}>
      {confidence}%
    </span>
  );
}
